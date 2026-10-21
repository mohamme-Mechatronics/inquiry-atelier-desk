import { createFileRoute } from "@tanstack/react-router";
import { botGuard } from "@/lib/bot.server";

// Telegram twin of the WhatsApp Cloud API used by the n8n bot.
// The Telegram copy of the workflow sends the exact same WhatsApp payloads here:
//   POST /api/public/tg-graph/<any>/messages  -> sent to Telegram
//   POST /api/public/tg-graph/<any>/media     -> file stored, returns { id }
//   POST /api/public/tg-graph/answer          -> answers a button tap
// Recipient "to" is "tg<chat_id>".

const TG = () => `https://api.telegram.org/bot${process.env["TELEGRAM_BOT_TOKEN"]}`;

function esc(t: string) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// WhatsApp formatting (*bold* _italic_ ~strike~ ```mono```) -> Telegram HTML
export function waToHtml(t: string) {
  let h = esc(t || "");
  h = h.replace(/```([\s\S]+?)```/g, "<code>$1</code>");
  h = h.replace(/(^|[\s(\[«"'])\*([^*\n]+?)\*(?=$|[\s).,:;!?؟،\]»"'])/gm, "$1<b>$2</b>");
  h = h.replace(/(^|[\s(\[«"'])_([^_\n]+?)_(?=$|[\s).,:;!?؟،\]»"'])/gm, "$1<i>$2</i>");
  h = h.replace(/(^|[\s(\[«"'])~([^~\n]+?)~(?=$|[\s).,:;!?؟،\]»"'])/gm, "$1<s>$2</s>");
  return h;
}

async function tg(method: string, body: Record<string, unknown> | FormData) {
  const isForm = body instanceof FormData;
  const r = await fetch(`${TG()}/${method}`, {
    method: "POST",
    headers: isForm ? {} : { "content-type": "application/json" },
    body: isForm ? body : JSON.stringify(body),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`telegram ${method} [${r.status}]: ${j.description || "error"}`);
  return j.result;
}

// send text; if HTML formatting is rejected, resend plain
async function sendText(chat_id: string, text: string, extra: Record<string, unknown> = {}) {
  const parts: string[] = [];
  let rest = text || " ";
  while (rest.length > 4000) {
    let cut = rest.lastIndexOf("\n", 4000);
    if (cut < 1000) cut = 4000;
    parts.push(rest.slice(0, cut) ?? "");
    rest = rest.slice(cut);
  }
  parts.push(rest);
  let last: any;
  for (let i = 0; i < parts.length; i++) {
    const ex = i === parts.length - 1 ? extra : {};
    try {
      last = await tg("sendMessage", { chat_id, text: waToHtml(parts[i]), parse_mode: "HTML", disable_web_page_preview: true, ...ex });
    } catch {
      last = await tg("sendMessage", { chat_id, text: parts[i], disable_web_page_preview: true, ...ex });
    }
  }
  return last;
}

async function sendMediaWithCaption(
  method: "sendPhoto" | "sendDocument" | "sendVideo" | "sendAudio",
  field: "photo" | "document" | "video" | "audio",
  chat_id: string,
  file: string | Blob,
  filename: string | undefined,
  caption: string,
  extra: Record<string, unknown> = {},
) {
  const longCap = caption.length > 1000;
  const cap = longCap ? "" : caption;
  const build = (html: boolean) => {
    const f = new FormData();
    f.append("chat_id", chat_id);
    if (typeof file === "string") f.append(field, file);
    else f.append(field, file, filename || "file.pdf");
    if (cap) {
      f.append("caption", html ? waToHtml(cap) : cap);
      if (html) f.append("parse_mode", "HTML");
    }
    if (!longCap && extra["reply_markup"]) f.append("reply_markup", JSON.stringify(extra["reply_markup"]));
    return f;
  };
  let res: any;
  try {
    res = await tg(method, build(true));
  } catch {
    res = await tg(method, build(false));
  }
  if (longCap) res = await sendText(chat_id, caption, extra);
  return res;
}

function keyboard(inter: any) {
  const a = inter?.action || {};
  if (Array.isArray(a.buttons) && a.buttons.length) {
    return {
      inline_keyboard: a.buttons.map((b: any) => [
        { text: String(b.reply?.title || b.title || "•"), callback_data: String(b.reply?.id || b.id || b.reply?.title || "x").slice(0, 64) },
      ]),
    };
  }
  if (Array.isArray(a.sections)) {
    const rows: any[] = [];
    for (const s of a.sections)
      for (const r of s.rows || []) {
        const label = r.description ? `${r.title} — ${r.description}` : String(r.title);
        rows.push([{ text: label.slice(0, 120), callback_data: String(r.id || r.title).slice(0, 64) }]);
      }
    return { inline_keyboard: rows };
  }
  if (a.name === "cta_url" && a.parameters?.url) {
    return { inline_keyboard: [[{ text: String(a.parameters.display_text || "فتح"), url: String(a.parameters.url) }]] };
  }
  return undefined;
}

async function fileFromId(db: any, id: string): Promise<Blob | null> {
  const { data } = await db.storage.from("tg-media").download(id);
  return data ?? null;
}

async function sendWa(db: any, p: any) {
  const chat_id = String(p.to || "").replace(/^tg/, "");
  if (!/^-?\d+$/.test(chat_id)) throw new Error("bad recipient");
  const type = p.type || "text";
  if (type === "text") return sendText(chat_id, p.text?.body || "");
  if (type === "interactive") {
    const it = p.interactive || {};
    const body = [it.header?.type === "text" ? `*${it.header.text}*` : "", it.body?.text || "", it.footer?.text ? `_${it.footer.text}_` : ""]
      .filter(Boolean)
      .join("\n\n");
    const reply_markup = keyboard(it);
    const extra = reply_markup ? { reply_markup } : {};
    const h = it.header;
    if (h && h.type && h.type !== "text" && h[h.type]) {
      const m = h[h.type];
      const src = m.link ? m.link : m.id ? await fileFromId(db, m.id) : null;
      if (src) {
        const map: any = { image: ["sendPhoto", "photo"], document: ["sendDocument", "document"], video: ["sendVideo", "video"] };
        const [meth, fld] = map[h.type] || map.document;
        return sendMediaWithCaption(meth, fld, chat_id, src, m.filename, body, extra);
      }
    }
    return sendText(chat_id, body, extra);
  }
  if (["image", "document", "video", "audio"].includes(type)) {
    const m = p[type] || {};
    const src = m.link ? String(m.link) : m.id ? await fileFromId(db, String(m.id)) : null;
    if (!src) throw new Error("media not found");
    const map: any = { image: ["sendPhoto", "photo"], document: ["sendDocument", "document"], video: ["sendVideo", "video"], audio: ["sendAudio", "audio"] };
    const [meth, fld] = map[type];
    if (typeof src === "string" && type === "document") {
      // download so the file keeps its proper name
      const r = await fetch(src);
      if (r.ok) {
        const b = await r.blob();
        const name = m.filename || decodeURIComponent(src.split("/").pop()?.split("?")[0] || "file.pdf");
        return sendMediaWithCaption(meth, fld, chat_id, b, name, String(m.caption || ""));
      }
    }
    return sendMediaWithCaption(meth, fld, chat_id, src, m.filename, String(m.caption || ""));
  }
  if (type === "location" && p.location) {
    return tg("sendLocation", { chat_id, latitude: p.location.latitude, longitude: p.location.longitude });
  }
  if (type === "template") return sendText(chat_id, "مرحباً 👋");
  return sendText(chat_id, p.text?.body || "");
}

export const Route = createFileRoute("/api/public/tg-graph/$")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const g = await botGuard(request);
        if (g.error) return g.error;
        if (!process.env["TELEGRAM_BOT_TOKEN"]) return Response.json({ error: "TELEGRAM_BOT_TOKEN missing" }, { status: 500 });
        const path = String((params as any)._splat || "");
        try {
          if (path === "answer") {
            const m: any = await request.json().catch(() => ({}));
            if (m.callback_query_id) await tg("answerCallbackQuery", { callback_query_id: String(m.callback_query_id) }).catch(() => null);
            return Response.json({ ok: true });
          }
          if (path.endsWith("/media")) {
            const form = await request.formData();
            const f = form.get("file");
            if (!f || typeof f === "string") return Response.json({ error: { message: "file missing" } }, { status: 400 });
            const blob = f as File;
            const id = `${Date.now()}-${crypto.randomUUID()}.pdf`;
            const { error } = await g.db!.storage.from("tg-media").upload(id, blob, { contentType: blob.type || "application/pdf" });
            if (error) return Response.json({ error: { message: error.message } }, { status: 500 });
            return Response.json({ id });
          }
          if (path.endsWith("/messages")) {
            const p: any = await request.json().catch(() => ({}));
            const r: any = await sendWa(g.db, p);
            const mid = r?.message_id ? `tg:${String(p.to).replace(/^tg/, "")}:${r.message_id}` : `tg:${Date.now()}`;
            return Response.json({ messaging_product: "whatsapp", contacts: [{ wa_id: p.to }], messages: [{ id: mid }] });
          }
          return Response.json({ error: { message: "unknown path" } }, { status: 404 });
        } catch (e: any) {
          console.error("tg-graph", e?.message);
          return Response.json({ error: { message: String(e?.message || e) } }, { status: 502 });
        }
      },
    },
  },
});
