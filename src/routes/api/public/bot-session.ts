import { createFileRoute } from "@tanstack/react-router";
import { botGuard, readJson, s } from "@/lib/bot.server";

// Replaces the n8n data table: action "get" returns the saved row (or {}),
// action "upsert" merges the given fields and returns the full row.
export const Route = createFileRoute("/api/public/bot-session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const g = await botGuard(request);
        if (g.error) return g.error;
        const m = await readJson(request);
        const phone = s(m.phone, 30);
        if (!phone) return Response.json({});
        const db = g.db!;
        const { data: cur } = await db.from("bot_sessions").select("data").eq("phone", phone).maybeSingle();
        const old = (cur?.data as Record<string, unknown>) ?? {};
        if (m.action !== "upsert") {
          return Response.json(cur ? { ...old, phone } : {});
        }
        const fields: Record<string, unknown> = { ...old };
        for (const [k, v] of Object.entries(m)) {
          if (k === "action" || k === "phone") continue;
          if (v !== undefined) fields[k] = v == null ? null : String(v).slice(0, 200000);
        }
        await db
          .from("bot_sessions")
          .upsert({ phone, data: fields as never, updated_at: new Date().toISOString() }, { onConflict: "phone" });
        return Response.json({ ...fields, phone });
      },
    },
  },
});
