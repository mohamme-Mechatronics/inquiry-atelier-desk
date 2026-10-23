import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, MessageCircle, ShoppingCart, Wrench, FileText, ArrowUpLeft, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Panel, Skeleton } from "@/components/admin";
import { STATUSES, CHANNELS, channelOf } from "@/lib/crm";

export const Route = createFileRoute("/_team/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "الرئيسية — تمكين" },
      { name: "description", content: "ملخص عملاء واتساب وتليجرام والطلبات" },
      { property: "og:title", content: "الرئيسية — تمكين" },
      { property: "og:description", content: "ملخص عملاء واتساب وتليجرام والطلبات" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { session } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [c, o, t, q] = await Promise.all([
        supabase.from("customers").select("phone,name,status,stage,last_at,last_message,created_at").order("last_at", { ascending: false }).limit(1000),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("tickets").select("id", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("kind", "document"),
      ]);
      const cs = c.data ?? [];
      const byStatus: Record<string, number> = {};
      const byCh = { whatsapp: 0, telegram: 0 };
      for (const r of cs) { byStatus[r.status] = (byStatus[r.status] ?? 0) + 1; byCh[channelOf(r.phone)]++; }
      const iso = today.toISOString();
      return {
        total: cs.length, todayN: cs.filter((x) => x.last_at >= iso).length, newToday: cs.filter((x) => x.created_at >= iso).length,
        byStatus, byCh, orders: o.count ?? 0, tickets: t.count ?? 0, quotes: q.count ?? 0,
      };
    },
    refetchInterval: 20000,
  });

  const cards = [
    { label: "إجمالي العملاء", v: data?.total, to: "/chats", icon: Users, tone: "bg-primary/10 text-primary" },
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
    <div className="space-y-3 md:space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-sidebar p-4 text-sidebar-foreground shadow-elevated md:p-7">
        <div className="absolute -start-16 -top-16 h-56 w-56 rounded-full bg-sidebar-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-sidebar-foreground/70">{hello}، <span dir="ltr">{name}</span></p>
            <h1 className="mt-0.5 text-xl font-extrabold md:text-3xl">لوحة متابعة المبيعات</h1>
            <p className="mt-1 hidden text-sm text-sidebar-foreground/70 sm:block">كل ما يحدث في بوت تمكين على واتساب وتليجرام لحظة بلحظة</p>
          </div>
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="text-2xl font-bold tabular-nums text-sidebar-primary md:text-3xl">{data?.newToday ?? 0}</div>
              <div className="text-xs text-sidebar-foreground/70">عملاء جدد اليوم</div>
            </div>
            <Link to="/chats" className="flex items-center gap-1 self-center rounded-lg bg-sidebar-primary px-3 py-1.5 text-sm font-bold text-sidebar-primary-foreground hover:opacity-90">
              فتح المحادثات <ArrowUpLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}
            className="group rounded-xl border bg-card p-2.5 shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated md:p-4">
            <div className="flex items-center justify-between">
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg md:h-9 md:w-9 ${c.tone}`}><c.icon className="h-3.5 w-3.5 md:h-4 md:w-4" /></span>
              <ArrowUpLeft className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </div>
            {isLoading ? <Skeleton className="mt-2 h-6 w-10" /> : <div className="mt-1.5 text-xl font-bold tabular-nums md:mt-3 md:text-3xl">{c.v ?? 0}</div>}
            <div className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground md:text-xs">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
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
  );
}
