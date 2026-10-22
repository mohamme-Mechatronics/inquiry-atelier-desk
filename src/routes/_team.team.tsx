import { AppSettings } from "@/components/AppSettings";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CheckCircle2, Copy, Eye, EyeOff, Plug, Users, Webhook, XCircle } from "lucide-react";
import { PageHeader } from "@/components/admin";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { checkChannels, getBotConnection } from "@/lib/settings.functions";

export const Route = createFileRoute("/_team/team")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border bg-muted/60 px-3 py-2">
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
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

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

  if (!isAdmin) return <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground shadow-card">هذه الصفحة للمدير فقط.</div>;
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

  const Status = ({ ok, info, name }: { ok: boolean | undefined; info: string | undefined; name: string }) => (
    <div className="flex items-center gap-3 rounded-lg border bg-background p-3 text-sm">
      {status.isFetching ? <span className="h-5 w-5 animate-pulse rounded-full bg-muted" /> : ok ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />}
      <div className="min-w-0 flex-1">
        <b className="block">{name}</b>
        <span className="block truncate text-xs tabular-nums text-muted-foreground" dir="ltr">{status.isFetching ? "…" : info}</span>
      </div>
      <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${status.isFetching ? "bg-muted text-muted-foreground" : ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
        {status.isFetching ? "جارٍ الفحص" : ok ? "متصل" : "غير متصل"}
      </span>
    </div>
  );

  const Step = ({ n, title, desc, icon: I, children }: { n: number; title: string; desc: string; icon: typeof Plug; children: ReactNode }) => (
    <section className="overflow-hidden rounded-xl border bg-card shadow-card">
      <header className="flex items-start gap-3 border-b p-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">{n}</span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 font-sans font-bold"><I className="h-4 w-4 text-accent" /> {title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
        </div>
      </header>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="الإعدادات والربط" description="ربط بوت واتساب وتليجرام باللوحة وإدارة صلاحيات فريق العمل" />

      <Step n={1} icon={Webhook} title="استقبال الرسائل من n8n" desc="البوت يرسل كل رسالة وطلب إلى هذه الروابط مع رأس x-bot-secret. ملف البوت الجاهز مربوط بها مسبقاً.">
        <CopyField label="رابط استقبال الرسائل" value={`${origin}/api/public/bot-message`} />
        <CopyField label="رابط الطلبات" value={`${origin}/api/public/bot-order`} />
        <CopyField label="رابط بلاغات الصيانة" value={`${origin}/api/public/bot-ticket`} />
        <CopyField label="x-bot-secret" value={conn.data?.secret ?? ""} secret />
        <details className="rounded-lg border">
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-muted-foreground">مثال للبيانات المرسلة</summary>
          <pre dir="ltr" className="overflow-x-auto border-t bg-muted p-3 text-start text-xs">{EXAMPLE}</pre>
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            direction: customer للعميل · bot لردود البوت — stage: quote · sld · buy · support · human
          </p>
        </details>
      </Step>

      <Step n={2} icon={Plug} title="الرد من اللوحة إلى العميل" desc="الرد من «المحادثات» يصل للعميل مباشرة على نفس القناة التي راسل منها.">
        <div className="grid gap-2 sm:grid-cols-2">
          <Status name="واتساب" ok={status.data?.whatsapp.ok} info={status.data?.whatsapp.info} />
          <Status name="تليجرام" ok={status.data?.telegram.ok} info={status.data?.telegram.info} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => status.refetch()} disabled={status.isFetching}>
            <Plug className="h-4 w-4" /> فحص الاتصال
          </Button>
          <p className="text-xs text-muted-foreground">واتساب يسمح بالرد خلال 24 ساعة من آخر رسالة للعميل.</p>
        </div>
      </Step>

      <Step n={3} icon={Users} title={`فريق العمل (${data?.members.length ?? 0})`} desc="كل موظف ينشئ حساباً من صفحة الدخول ثم تفعّله هنا. الموظف يرى المحادثات ويرد، والإعدادات للمدير فقط.">
        <ul className="divide-y rounded-lg border">
          {data?.members.map((m) => {
            const r = roleOf(m.user_id);
            const me = m.user_id === session?.user.id;
            const role = r.includes("admin") ? "admin" : r.includes("staff") ? "staff" : null;
            return (
              <li key={m.user_id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold uppercase text-primary">{(m.email ?? "?").slice(0, 1)}</span>
                <div className="min-w-0 flex-1">
                  <span dir="ltr" className="block truncate text-start font-medium">{m.email}{me && <span className="ms-1 text-xs text-muted-foreground">(أنت)</span>}</span>
                  <span className={`mt-0.5 inline-block rounded-md px-1.5 text-[11px] font-semibold ${role === "admin" ? "bg-primary/10 text-primary" : role === "staff" ? "bg-success/10 text-success" : "bg-warning/15 text-warning-foreground"}`}>
                    {role === "admin" ? "مدير" : role === "staff" ? "موظف" : "بانتظار التفعيل"}
                  </span>
                </div>
                {!me && (
                  <div className="flex rounded-lg border p-0.5">
                    {([["staff", "موظف"], ["admin", "مدير"], [null, "إيقاف"]] as const).map(([k, l]) => (
                      <button key={l} onClick={() => setRole(m.user_id, k)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium ${role === k ? (k ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground") : "text-muted-foreground hover:bg-muted"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Step>

      <AppSettings />
    </div>
  );
}
