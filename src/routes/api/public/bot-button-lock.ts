import { createFileRoute } from "@tanstack/react-router";
import { botGuard, readJson, s } from "@/lib/bot.server";

// First caller for a given context_id wins; repeats get allowed:false.
export const Route = createFileRoute("/api/public/bot-button-lock")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const g = await botGuard(request);
        if (g.error) return g.error;
        const m = await readJson(request);
        const id = s(m.context_id, 300);
        if (!id) return Response.json({ allowed: true });
        const { error } = await g.db!
          .from("button_locks")
          .insert({ context_id: id, phone: s(m.phone, 30), choice: s(m.choice, 300) });
        if (error && error.code === "23505") return Response.json({ allowed: false });
        return Response.json({ allowed: true });
      },
    },
  },
});
