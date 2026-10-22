import { createFileRoute } from "@tanstack/react-router";
import { botGuard, readJson, recordQuoteOrder, s, touchCustomer } from "@/lib/bot.server";

export const Route = createFileRoute("/api/public/bot-media")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const g = await botGuard(request);
        if (g.error) return g.error;
        const m = await readJson(request);
        const phone = s(m.phone, 30);
        if (!phone) return Response.json({ error: "phone required" }, { status: 400 });
        await touchCustomer(g.db!, { phone, stage: "quote", text: m.text });
        await g.db!.from("messages").insert({
          phone,
          direction: "bot",
          kind: "document",
          text: s(m.text),
          media_id: s(m.media_id, 200),
          mime: s(m.mime, 100) ?? "application/pdf",
          file_name: s(m.file_name, 200),
          stage: "quote",
        });
        await recordQuoteOrder(g.db!, phone, m.text);
        return Response.json({ ok: true });
      },
    },
  },
});
