import { createFileRoute } from "@tanstack/react-router";
import { botGuard, readJson, s } from "@/lib/bot.server";

export const Route = createFileRoute("/api/public/bot-paused")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const g = await botGuard(request);
        if (g.error) return g.error;
        const m = await readJson(request);
        const phone = s(m.phone, 30);
        if (!phone) return Response.json({ paused: false });
        const { data } = await g.db!.from("customers").select("bot_paused").eq("phone", phone).maybeSingle();
        return Response.json({ paused: !!data?.bot_paused });
      },
    },
  },
});
