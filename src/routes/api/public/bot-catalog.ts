import { createFileRoute } from "@tanstack/react-router";
import { botGuard } from "@/lib/bot.server";

export const Route = createFileRoute("/api/public/bot-catalog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const g = await botGuard(request);
        if (g.error) return g.error;
        const { data } = await g.db!.from("catalog_items").select("*");
        const ITEMS: Record<string, unknown> = {};
        for (const r of data ?? []) {
          ITEMS[r.code] = {
            name: r.name,
            unit: r.unit,
            price: r.price == null ? null : Number(r.price),
            specs: Array.isArray(r.specs) ? r.specs : [],
          };
        }
        return Response.json({ ITEMS });
      },
    },
  },
});
