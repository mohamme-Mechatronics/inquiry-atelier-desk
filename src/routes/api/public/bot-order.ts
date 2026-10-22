import { createFileRoute } from "@tanstack/react-router";
import { botGuard, readJson, s, touchCustomer } from "@/lib/bot.server";
import { saveBotOrder } from "@/lib/bot-orders.server";

export const Route = createFileRoute("/api/public/bot-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const g = await botGuard(request);
        if (g.error) return g.error;
        if (!g.db) return Response.json({ error: "unauthorized" }, { status: 401 });
        const m = await readJson(request);
        if (!m || typeof m !== 'object' || Array.isArray(m)) return Response.json({ error: "invalid order" }, { status: 400 });
        const phone = s(m.phone, 30);
        if (!phone) return Response.json({ error: "phone required" }, { status: 400 });
        await touchCustomer(g.db, { phone, name: m.name, city: m.city, stage: "buy" });
        const { error } = await saveBotOrder(g.db, { ...m, phone });
        if (error) return Response.json({ error: "could not save order" }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
