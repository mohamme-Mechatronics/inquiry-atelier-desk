import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, MessageCircle, ShoppingCart, Wrench, FileText, Bell, Headset, UserPlus, ArrowUpLeft, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Panel, EmptyState, ChannelBadge, Skeleton } from "@/components/admin";
import { STATUSES, CHANNELS, channelOf, ago, preview } from "@/lib/crm";

export const Route = createFileRoute("/_team/")({
  head: () => ({
    meta: [
      { title: "الرئيسية — تمكين" },
      { name: "description", content: "ملخص عملاء واتساب وتليجرام والطلبات والإشعارات" },
      { property: "og:title", content: "الرئيسية — تمكين" },
      { property: "og:description", content: "ملخص عملاء واتساب وتليجرام والطلبات والإشعارات" },
    ],
  }),
  component: Dashboard,
});

type Kind = "order" | "ticket" | "human" | "new";
const KIND: Record<Kind, { icon: typeof Bell; cls: string }> = {
  order: { icon: ShoppingCart, cls: "bg-success/10 text-success" },
  ticket: { icon: Wrench, cls: "bg-destructive/10 text-destructive" },
  human: { icon: Headset, cls: "bg-warning/15 text-warning-foreground" },
  new: { icon: UserPlus, cls: "bg-info/10 text-info" },
};

function Dashboard() {
  const { session } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [c, o, t, q, recentO, recentT] = await Promise.all([
        supabase.from("customers").select("phone,name,status,stage,last_at,last_message,created_at").order("last_at", { ascending: false }).limit(1000),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("tickets").select("id", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("kind", "document"),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("tickets").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      const cs = c.data ?? [];
      const byStatus: Record<string, number> = {};
      const byCh = { whatsapp: 0, telegram: 0 };
      for (const r of cs) { byStatus[r.status] = (byStatus[r.status] ?? 0) + 1; byCh[channelOf(r.phone)]++; }
      const iso = today.toISOString();
      type N = { key: string; kind: Kind; title: string; sub: string; at: string; phone: string };
      const notes: N[] = [
        ...(recentO.data ?? []).map((x): N => ({ key: "o" + x.id, kind: "order", title: `طلب شراء — ${x.name || x.phone}`, sub: `${x.amount || ""} ${x.method || ""}`.trim(), at: x.created_at, phone: x.phone })),
        ...(recentT.data ?? []).map((x): N => ({ key: "t" + x.id, kind: "ticket", title: `بلاغ صيانة ${x.ticket_no} — ${x.name || x.phone}`, sub: x.issue_type || x.description || "", at: x.created_at, phone: x.phone })),
        ...cs.filter((x) => x.stage === "human").slice(0, 5).map((x): N => ({ key: "h" + x.phone, kind: "human", title: `يحتاج موظف — ${x.name || x.phone}`, sub: x.last_message || "", at: x.last_at, phone: x.phone })),
        ...cs.filter((x) => x.created_at >= iso).slice(0, 5).map((x): N => ({ key: "n" + x.phone, kind: "new", title: `عميل جديد — ${x.name || x.phone}`, sub: x.last_message || "", at: x.created_at, phone: x.phone })),
      ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 12);
      return {
        total: cs.length, todayN: cs.filter((x) => x.last_at >= iso).length, newToday: cs.filter((x) => x.created_at >= iso).length,
        byStatus, byCh, orders: o.count ?? 0, tickets: t.count ?? 0, quotes: q.count ?? 0, notes,
      };
    },
    refetchInterval: 20000,
  });

  const cards = [
    { label: "إجمالي العملاء", v: data?.total, to: "/customers", icon: Users, tone: "bg-primary/10 text-primary" },
    { label: "نشطون اليوم", v: data?.todayN, to: "/chats", icon: MessageCircle, tone: "bg-info/10 text-info" },
    { label: "طلبات جديدة", v: data?.orders, to: "/orders", icon: ShoppingCart, tone: "bg-success/10 text-success" },
    { label: "بلاغات مفتوحة", v: data?.tickets, to: "/tickets", icon: Wrench, tone: "bg-destructive/10 text-destructive" },
    { label: "ملفات مرسلة", v: data?.quotes, to: "/quotes", icon: FileText, tone: "bg-accent/20 text-accent-foreground" },
  ] as const;
  const total = data?.total || 0;
  const hour = new Date().getHours();
  const hello = hour < 12 ? "صباح الخير" : "مساء الخير";
  const name = session?.user.email?.split("@")[0] ?? "";

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-sidebar p-5 text-sidebar-foreground shadow-elevated md:p-7">
        <div className="absolute -start-16 -top-16 h-56 w-56 rounded-full bg-sidebar-primary/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-sidebar-foreground/70">{hello}، <span dir="ltr">{name}</span></p>
            <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">لوحة متابعة المبيعات</h1>
            <p className="mt-1 text-sm text-sidebar-foreground/70">كل ما يحدث في بوت تمكين على واتساب وتليجرام لحظة بلحظة</p>
          </div>
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="text-3xl font-bold tabular-nums text-sidebar-primary">{data?.newToday ?? 0}</div>
              <div className="text-xs text-sidebar-foreground/70">عملاء جدد اليوم</div>
            </div>
            <Link to="/chats" className="flex items-center gap-1 self-center rounded-lg bg-sidebar-primary px-4 py-2 text-sm font-bold text-sidebar-primary-foreground hover:opacity-90">
              فتح المحادثات <ArrowUpLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c, i) => (
          <Link key={c.label} to={c.to}
            className={`group rounded-xl border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated ${i === 0 ? "col-span-2 lg:col-span-1" : ""}`}>
            <div className="flex items-center justify-between">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.tone}`}><c.icon className="h-4 w-4" /></span>
              <ArrowUpLeft className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </div>
            {isLoading ? <Skeleton className="mt-3 h-8 w-14" /> : <div className="mt-3 text-3xl font-bold tabular-nums">{c.v ?? 0}</div>}
            <div className="mt-0.5 text-xs font-medium text-muted-foreground">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="آخر الإشعارات" icon={Bell} className="lg:col-span-2"
          action={<Link to="/chats" className="text-xs font-semibold text-primary hover:underline">عرض الكل</Link>}>
          {isLoading && <div className="space-y-3 p-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}</div>}
          {!isLoading && !data?.notes.length && <EmptyState icon={Bell} title="لا توجد إشعارات بعد" hint="ستظهر هنا الطلبات وبلاغات الصيانة والعملاء الجدد فور وصولها من البوت." />}
          <ul className="divide-y">
            {data?.notes.map((n) => {
              const k = KIND[n.kind];
              return (
                <li key={n.key}>
                  <Link to="/chats" search={{ p: n.phone }} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${k.cls}`}><k.icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{n.title}</span>
                        <ChannelBadge phone={n.phone} />
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{preview(n.sub) || "—"}</div>
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{ago(n.at)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="space-y-4">
          <Panel title="توزيع القنوات" icon={Activity} bodyClass="space-y-4 p-4">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
              {(["whatsapp", "telegram"] as const).map((k) => (
                <div key={k} className={CHANNELS[k].dot} style={{ width: `${total ? ((data?.byCh[k] ?? 0) / total) * 100 : 0}%` }} />
              ))}
            </div>
            {(["whatsapp", "telegram"] as const).map((k) => (
              <div key={k} className="flex items-center gap-2 text-sm">
                <span className={`h-2.5 w-2.5 rounded-full ${CHANNELS[k].dot}`} />
                <span className="flex-1">{CHANNELS[k].label}</span>
                <b className="tabular-nums">{data?.byCh[k] ?? 0}</b>
                <span className="w-10 text-end text-xs tabular-nums text-muted-foreground">
                  {total ? Math.round(((data?.byCh[k] ?? 0) / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </Panel>
          <Panel title="مسار العملاء" icon={Users} bodyClass="space-y-3 p-4">
            {Object.entries(STATUSES).map(([k, s]) => {
              const n = data?.byStatus[k] ?? 0;
              return (
                <div key={k} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>{s.label}</span>
                    <b className="tabular-nums">{n}</b>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
                  </div>
                </div>
              );
            })}
          </Panel>
        </div>
      </div>
    </div>
  );
}
