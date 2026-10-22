import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { channelOf } from "@/lib/crm";

// Staff reply from the panel, delivered on the customer's own channel.
export const sendReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { phone: string; text: string }) => {
    const phone = String(d?.phone ?? "").replace(/\D/g, "").slice(0, 30);
    const text = String(d?.text ?? "").trim().slice(0, 4000);
    if (!phone || !text) throw new Error("الرقم والنص مطلوبان");
    return { phone, text };
  })
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (!roles?.length) throw new Error("غير مصرح");

    const ch = channelOf(data.phone);
    if (ch === "telegram") {
      const token = process.env["TELEGRAM_BOT_TOKEN"];
      if (!token) throw new Error("ربط تليجرام غير مكتمل");
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: data.phone, text: data.text }),
      });
      const j: any = await r.json().catch(() => ({}));
      if (!j.ok) throw new Error(`تعذر الإرسال عبر تليجرام: ${j.description || r.status}`);
    } else {
      const token = process.env["WHATSAPP_TOKEN"];
      const pnid = process.env["WHATSAPP_PHONE_NUMBER_ID"];
      if (!token || !pnid) throw new Error("ربط واتساب للرد من الإدارة غير مكتمل");
      const r = await fetch(`https://graph.facebook.com/v21.0/${pnid}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messaging_product: "whatsapp", to: data.phone, type: "text", text: { body: data.text } }),
      });
      if (!r.ok) {
        const t = await r.text();
        console.error("wa reply", r.status, t);
        throw new Error(`تعذر الإرسال عبر واتساب (${r.status}). قد تكون مرت 24 ساعة على آخر رسالة من العميل.`);
      }
    }
    await context.supabase.from("messages").insert({ phone: data.phone, direction: "staff", kind: "text", text: data.text });
    await context.supabase.from("customers").update({ last_message: data.text.slice(0, 300), last_at: new Date().toISOString() }).eq("phone", data.phone);
    return { ok: true };
  });

// Staff sends an uploaded file (image/PDF) from the panel on the customer's channel.
export const sendFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { phone: string; path: string; name: string; mime: string; caption?: string }) => {
    const phone = String(d?.phone ?? "").replace(/\D/g, "").slice(0, 30);
    const path = String(d?.path ?? "").slice(0, 300);
    if (!phone || !path) throw new Error("بيانات الملف ناقصة");
    return { phone, path, name: String(d?.name ?? "file").slice(0, 120), mime: String(d?.mime ?? ""), caption: String(d?.caption ?? "").slice(0, 900) };
  })
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (!roles?.length) throw new Error("غير مصرح");
    const { data: s, error } = await context.supabase.storage.from("chat-files").createSignedUrl(data.path, 60 * 60 * 24 * 7);
    if (error || !s) throw new Error("تعذر تجهيز الملف");
    const url = s.signedUrl;
    const isImg = data.mime.startsWith("image/");
    if (channelOf(data.phone) === "telegram") {
      const token = process.env["TELEGRAM_BOT_TOKEN"];
      if (!token) throw new Error("ربط تليجرام غير مكتمل");
      const r = await fetch(`https://api.telegram.org/bot${token}/${isImg ? "sendPhoto" : "sendDocument"}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: data.phone, [isImg ? "photo" : "document"]: url, caption: data.caption || undefined }),
      });
      const j: any = await r.json().catch(() => ({}));
      if (!j.ok) throw new Error(`تعذر الإرسال عبر تليجرام: ${j.description || r.status}`);
    } else {
      const token = process.env["WHATSAPP_TOKEN"];
      const pnid = process.env["WHATSAPP_PHONE_NUMBER_ID"];
      if (!token || !pnid) throw new Error("ربط واتساب غير مكتمل");
      const media = isImg ? { link: url, caption: data.caption || undefined } : { link: url, filename: data.name, caption: data.caption || undefined };
      const r = await fetch(`https://graph.facebook.com/v21.0/${pnid}/messages`, {
        method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messaging_product: "whatsapp", to: data.phone, type: isImg ? "image" : "document", [isImg ? "image" : "document"]: media }),
      });
      if (!r.ok) { console.error("wa file", r.status, await r.text()); throw new Error(`تعذر الإرسال عبر واتساب (${r.status})`); }
    }
    await context.supabase.from("messages").insert({ phone: data.phone, direction: "staff", kind: isImg ? "image" : "document", text: `📎 ${data.name}${data.caption ? " — " + data.caption : ""}`, file_name: data.name, mime: data.mime });
    await context.supabase.from("customers").update({ last_message: `📎 ${data.name}`, last_at: new Date().toISOString() }).eq("phone", data.phone);
    return { ok: true };
  });
