import { createFileRoute } from "@tanstack/react-router";
import { botGuard, readJson, s, touchCustomer } from "@/lib/bot.server";

export const Route = createFileRoute("/api/public/bot-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const g = await botGuard(request);
        if (g.error) return g.error;
        const m = await readJson(request);
        const phone = s(m.phone, 30);
        if (!phone) return Response.json({ error: "phone required" }, { status: 400 });
        await touchCustomer(g.db!, { phone, name: m.name, city: m.city, stage: "buy" });
        const { error } = await g.db!.from("orders").insert({
          phone,
          name: s(m.name, 120),
          city: s(m.city, 120),
          invoice_no: s(m.invoice_no, 100),
          amount: s(m.amount, 100),
          method: s(m.method, 100),
          details: s(m.details),
        });
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
