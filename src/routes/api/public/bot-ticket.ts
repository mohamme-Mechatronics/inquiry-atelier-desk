import { createFileRoute } from "@tanstack/react-router";
import { botGuard, readJson, s, touchCustomer } from "@/lib/bot.server";

export const Route = createFileRoute("/api/public/bot-ticket")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const g = await botGuard(request);
        if (g.error) return g.error;
        const m = await readJson(request);
        const phone = s(m.phone, 30);
        if (!phone) return Response.json({ error: "phone required" }, { status: 400 });
        const { data: no } = await g.db!.rpc("next_ticket_no");
        const ticket_no = String(no ?? `TMK-SUP-${Date.now()}`);
        await touchCustomer(g.db!, { phone, name: m.name, city: m.city, stage: "support" });
        const { error } = await g.db!.from("tickets").insert({
          ticket_no,
          phone,
          name: s(m.name, 120),
          city: s(m.city, 120),
          device: s(m.device, 200),
          issue_type: s(m.issue_type, 200),
          description: s(m.description),
          media_id: s(m.media_id, 200),
          media_type: s(m.media_type, 40),
        });
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true, ticket_no });
      },
    },
  },
});
