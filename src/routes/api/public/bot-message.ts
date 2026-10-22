import { createFileRoute } from "@tanstack/react-router";
import { botGuard, readJson, recordQuoteOrder, s, touchCustomer } from "@/lib/bot.server";

export const Route = createFileRoute("/api/public/bot-message")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const g = await botGuard(request);
        if (g.error) return g.error;
        const body = await readJson(request);
        const list: any[] = Array.isArray(body) ? body : [body];
        let saved = 0;
        for (const m of list) {
          const phone = s(m?.phone, 30);
          if (!phone) continue;
          await touchCustomer(g.db!, { ...m, phone });
          const { error } = await g.db!.from("messages").insert({
            phone,
            direction: s(m.direction, 20) ?? "customer",
            kind: s(m.kind, 20) ?? "text",
            text: s(m.text),
            media_id: s(m.media_id, 200),
            mime: s(m.mime, 100),
            file_name: s(m.file_name, 200),
            stage: s(m.stage, 40),
          });
          if (!error) saved++;
          if (/عرض سعر/.test(String(m.text ?? "")) && (m.kind === "pdf" || m.kind === "document")) await recordQuoteOrder(g.db!, phone, m.text);
        }
        return Response.json({ ok: true, saved });
      },
    },
  },
});
