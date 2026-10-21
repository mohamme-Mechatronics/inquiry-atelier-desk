import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Copy, Eye, EyeOff, Plug, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { checkChannels, getBotConnection } from "@/lib/settings.functions";

export const Route = createFileRoute("/_team/team")({
  head: () => ({
    meta: [
      { title: "الإعدادات والربط — تمكين" },
      { name: "description", content: "ربط بوت واتساب وتليجرام بالإدارة وإدارة فريق العمل" },
      { property: "og:title", content: "الإعدادات والربط — تمكين" },
      { property: "og:description", content: "ربط بوت واتساب وتليجرام بالإدارة وإدارة فريق العمل" },
    ],
  }),
  component: Team,
});

const EXAMPLE = `{
  "phone": "{{phone}}",
  "name": "{{name}}",
  "direction": "customer",
  "kind": "text",
  "text": "{{message}}",
  "stage": "quote"
}`;

function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [show, setShow] = useState(!secret);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    toast.success("تم النسخ");
  };
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
        <button onClick={copy} aria-label="نسخ" className="text-primary"><Copy className="h-4 w-4" /></button>
        {secret && (
          <button onClick={() => setShow(!show)} aria-label="إظهار" className="text-muted-foreground">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        <span dir="ltr" className="min-w-0 flex-1 truncate text-start font-mono text-xs">
          {show ? value || "—" : "••••••••••••••••••••"}
        </span>
      </div>
    </div>
  );
}

function Team() {
  const { isAdmin, session } = useAuth();
  const qc = useQueryClient();
  const getConn = useServerFn(getBotConnection);
  const check = useServerFn(checkChannels);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const { data } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const [m, r] = await Promise.all([
        supabase.from("team_members").select("*").order("created_at"),
        supabase.from("user_roles").select("*"),
      ]);
      return { members: m.data ?? [], roles: r.data ?? [] };
    },
  });
  const conn = useQuery({ queryKey: ["bot-conn"], queryFn: () => getConn(), enabled: isAdmin });
  const status = useQuery({ queryKey: ["channels"], queryFn: () => check(), enabled: isAdmin });

  if (!isAdmin) return <p className="text-muted-foreground">هذه الصفحة للمدير فقط.</p>;
  const roleOf = (id: string) => data?.roles.filter((r) => r.user_id === id).map((r) => r.role) ?? [];
  const setRole = async (user_id: string, role: "staff" | "admin" | null) => {
    await supabase.from("user_roles").delete().eq("user_id", user_id);
    if (role) {
      const { error } = await supabase.from("user_roles").insert({ user_id, role });
      if (error) { toast.error("تعذر الحفظ"); return; }
    }
    toast.success("تم التحديث");
    qc.invalidateQueries({ queryKey: ["team"] });
  };

  const Status = ({ ok, info, name }: { ok?: boolean; info?: string; name: string }) => (
    <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
      {status.isFetching ? <span className="h-4 w-4 animate-pulse rounded-full bg-muted" /> : ok ? <CheckCircle2 className="h-4 w-4 text-chart-3" /> : <XCircle className="h-4 w-4 text-destructive" />}
      <b>{name}</b>
      <span className="ms-auto text-xs text-muted-foreground" dir="ltr">{status.isFetching ? "…" : info}</span>
      <span className={`text-xs ${ok ? "text-chart-3" : "text-destructive"}`}>{status.isFetching ? "" : ok ? "مربوط ✓" : "غير مربوط"}</span>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-extrabold">الإعدادات والربط مع البوت</h1>

      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="font-bold text-primary">١. استقبال الرسائل من n8n</h2>
        <p className="text-sm text-muted-foreground">
          البوت (واتساب وتليجرام) يرسل كل رسالة وطلب إلى هذه الروابط مع رأس <span dir="ltr" className="font-mono">x-bot-secret</span>. ملف البوت الجاهز مربوط بها مسبقاً.
        </p>
        <CopyField label="رابط استقبال الرسائل" value={`${origin}/api/public/bot-message`} />
        <CopyField label="رابط الطلبات" value={`${origin}/api/public/bot-order`} />
        <CopyField label="رابط بلاغات الصيانة" value={`${origin}/api/public/bot-ticket`} />
        <CopyField label="x-bot-secret" value={conn.data?.secret ?? ""} secret />
        <div>
          <p className="mb-1 text-xs text-muted-foreground">مثال للبيانات المرسلة</p>
          <pre dir="ltr" className="overflow-x-auto rounded-lg bg-muted p-3 text-start text-xs">{EXAMPLE}</pre>
          <p className="mt-1 text-xs text-muted-foreground">
            direction: customer للعميل · bot لردود البوت — stage: quote · sld · buy · support · human
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="font-bold text-primary">٢. الرد من اللوحة إلى العميل</h2>
        <p className="text-sm text-muted-foreground">الرد من صفحة «المحادثات» يصل للعميل مباشرة على نفس القناة التي راسل منها، بدون n8n.</p>
        <Status name="واتساب" ok={status.data?.whatsapp.ok} info={status.data?.whatsapp.info} />
        <Status name="تليجرام" ok={status.data?.telegram.ok} info={status.data?.telegram.info} />
        <Button variant="outline" size="sm" onClick={() => status.refetch()} disabled={status.isFetching}>
          <Plug className="h-4 w-4" /> فحص الاتصال
        </Button>
        <p className="text-xs text-muted-foreground">واتساب يسمح بالرد خلال 24 ساعة من آخر رسالة للعميل.</p>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="font-bold text-primary">فريق العمل ({data?.members.length ?? 0})</h2>
        <p className="text-sm text-muted-foreground">كل موظف ينشئ حساباً من صفحة الدخول، ثم تفعّله أنت هنا. الموظفون يرون المحادثات ويردون، والإعدادات للمدير فقط.</p>
        <div className="divide-y rounded-lg border">
          {data?.members.map((m) => {
            const r = roleOf(m.user_id);
            const me = m.user_id === session?.user.id;
            return (
              <div key={m.user_id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                <span dir="ltr" className="flex-1 text-start">{m.email}</span>
                <span className="rounded-full border px-2 text-xs">{r.includes("admin") ? "مدير" : r.includes("staff") ? "موظف" : "بانتظار التفعيل"}</span>
                {!me && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setRole(m.user_id, "staff")}>موظف</Button>
                    <Button size="sm" variant="outline" onClick={() => setRole(m.user_id, "admin")}>مدير</Button>
                    <Button size="sm" variant="ghost" onClick={() => setRole(m.user_id, null)}>إيقاف</Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
