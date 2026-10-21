import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Admin-only: the bot connection password shown on the settings page so the manager can copy it into n8n.
export const getBotConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("هذه الصفحة للمدير فقط");
    return { secret: process.env["BOT_SECRET"] ?? "" };
  });

// Team-only: checks that the WhatsApp and Telegram keys still work.
export const checkChannels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (!roles?.length) throw new Error("غير مصرح");

    const out = { whatsapp: { ok: false, info: "" }, telegram: { ok: false, info: "" } };
    const wt = process.env["WHATSAPP_TOKEN"];
    const wp = process.env["WHATSAPP_PHONE_NUMBER_ID"];
    if (wt && wp) {
      try {
        const r = await fetch(`https://graph.facebook.com/v21.0/${wp}`, { headers: { Authorization: `Bearer ${wt}` } });
        const j: any = await r.json().catch(() => ({}));
        out.whatsapp = r.ok ? { ok: true, info: j.display_phone_number ?? "" } : { ok: false, info: "مفتاح واتساب غير صالح أو منتهي" };
      } catch {
        out.whatsapp.info = "تعذر الوصول إلى واتساب";
      }
    } else out.whatsapp.info = "مفتاح واتساب غير مضاف";

    const tt = process.env["TELEGRAM_BOT_TOKEN"];
    if (tt) {
      try {
        const j: any = await (await fetch(`https://api.telegram.org/bot${tt}/getMe`)).json();
        out.telegram = j.ok ? { ok: true, info: `@${j.result.username}` } : { ok: false, info: "توكن تليجرام غير صالح" };
      } catch {
        out.telegram.info = "تعذر الوصول إلى تليجرام";
      }
    } else out.telegram.info = "توكن تليجرام غير مضاف";
    return out;
  });
