// Shared helpers for the endpoints the WhatsApp bot (n8n) calls.
export async function botGuard(request: Request) {
  const secret = process.env.BOT_SECRET;
  const got = request.headers.get("x-bot-secret");
  if (!secret || !got || got !== secret) {
    return { error: Response.json({ error: "unauthorized" }, { status: 401 }) };
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { db: supabaseAdmin };
}

export async function readJson(request: Request): Promise<any> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

const s = (v: unknown, n = 4000) => (v == null || v === "" ? null : String(v).slice(0, n));
export { s };

type DB = Awaited<ReturnType<typeof botGuard>>["db"];

export async function touchCustomer(
  db: NonNullable<DB>,
  m: { phone: string; name?: unknown; city?: unknown; system?: unknown; stage?: unknown; text?: unknown },
) {
  const { data: cur } = await db.from("customers").select("*").eq("phone", m.phone).maybeSingle();
  const row = {
    phone: m.phone,
    name: s(m.name, 120) ?? cur?.name ?? null,
    city: s(m.city, 120) ?? cur?.city ?? null,
    system: s(m.system, 200) ?? cur?.system ?? null,
    stage: s(m.stage, 40) ?? cur?.stage ?? null,
    last_message: s(m.text, 300) ?? cur?.last_message ?? null,
    last_at: new Date().toISOString(),
  };
  await db.from("customers").upsert(row, { onConflict: "phone" });
}
