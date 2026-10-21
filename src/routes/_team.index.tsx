import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, MessageCircle, ShoppingCart, Wrench, FileText, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STATUSES, STAGES, CHANNELS, channelOf, fmt } from "@/lib/crm";

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

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [c, o, t, q, recentO, recentT] = await Promise.all([
        supabase.from("customers").select("phone,name,status,stage,last_at,last_message,created_at").order("last_at", { ascending: false }).limit(1000),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("tickets").select("id", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("stage", "quote").eq("kind", "document"),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("tickets").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      const cs = c.data ?? [];
      const byStatus: Record<string, number> = {};
      const byCh = { whatsapp: 0, telegram: 0 };
      for (const r of cs) { byStatus[r.status] = (byStatus[r.status] ?? 0) + 1; byCh[channelOf(r.phone)]++; }
      const iso = today.toISOString();
      type N = { key: string; title: string; sub: string; at: string; phone: string };
      const notes: N[] = [
        ...(recentO.data ?? []).map((x) => ({ key: "o" + x.id, title: `طلب شراء — ${x.name || x.phone}`, sub: `${x.amount || ""} ${x.method || ""}`.trim(), at: x.created_at, phone: x.phone })),
        ...(recentT.data ?? []).map((x) => ({ key: "t" + x.id, title: `بلاغ صيانة ${x.ticket_no} — ${x.name || x.phone}`, sub: x.issue_type || x.description || "", at: x.created_at, phone: x.phone })),
        ...cs.filter((x) => x.stage === "human").slice(0, 5).map((x) => ({ key: "h" + x.phone, title: `يحتاج موظف — ${x.name || x.phone}`, sub: x.last_message || "", at: x.last_at, phone: x.phone })),
        ...cs.filter((x) => x.created_at >= iso).slice(0, 5).map((x) => ({ key: "n" + x.phone, title: `عميل جديد — ${x.name || x.phone}`, sub: x.last_message || "", at: x.created_at, phone: x.phone })),
      ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 12);
      return {
        total: cs.length, todayN: cs.filter((x) => x.last_at >= iso).length, byStatus, byCh,
        orders: o.count ?? 0, tickets: t.count ?? 0, quotes: q.count ?? 0, notes,
      };
    },
    refetchInterval: 20000,
  });

  const cards = [
    { label: "إجمالي العملاء", v: data?.total, to: "/customers", icon: Users },
    { label: "عملاء اليوم", v: data?.todayN, to: "/chats", icon: MessageCircle },
    { label: "طلبات جديدة", v: data?.orders, to: "/orders", icon: ShoppingCart },
    { label: "بلاغات صيانة مفتوحة", v: data?.tickets, to: "/tickets", icon: Wrench },
    { label: "عروض أسعار مرسلة", v: data?.quotes, to: "/quotes", icon: FileText },
  ] as const;
  const total = data?.total || 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">أهلاً بك 👑</h1>
        <p className="text-sm text-muted-foreground">كل ما يحدث في بوت تمكين على واتساب وتليجرام لحظة بلحظة</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="rounded-xl border bg-card p-4 shadow-sm hover:border-accent">
            <c.icon className="h-5 w-5 text-primary" />
            <div className="mt-2 text-3xl font-extrabold">{c.v ?? "—"}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 border-b p-3 font-bold"><Bell className="h-4 w-4 text-primary" /> الإشعارات</div>
          {!data?.notes.length && <p className="p-6 text-center text-sm text-muted-foreground">لا توجد إشعارات بعد</p>}
          {data?.notes.map((n) => {
            const ch = CHANNELS[channelOf(n.phone)];
            return (
              <Link key={n.key} to="/chats" search={{ p: n.phone }} className="flex items-start gap-2 border-b p-3 last:border-0 hover:bg-muted">
                <span className={`mt-0.5 shrink-0 rounded px-1 text-[10px] ${ch.cls}`}>{ch.label}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{n.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{n.sub}</div>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">{fmt(n.at)}</span>
              </Link>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="mb-3 font-bold">القنوات</h2>
            {(["whatsapp", "telegram"] as const).map((k) => (
              <div key={k} className="flex items-center justify-between py-1 text-sm">
                <span className={`rounded px-2 py-0.5 text-xs ${CHANNELS[k].cls}`}>{CHANNELS[k].label}</span>
                <b>{data?.byCh[k] ?? 0} عميل</b>
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="mb-3 font-bold">حالة العملاء</h2>
            {Object.entries(STATUSES).map(([k, s]) => {
              const n = data?.byStatus[k] ?? 0;
              return (
                <div key={k} className="mb-2 flex items-center gap-2 text-sm">
                  <span className="w-24">{s.label}</span>
                  <div className="h-2.5 flex-1 rounded-full bg-muted">
                    <div className="h-2.5 rounded-full bg-primary" style={{ width: `${(n / total) * 100}%` }} />
                  </div>
                  <b className="w-6 text-left">{n}</b>
                </div>
              );
            })}
            <p className="mt-2 text-[11px] text-muted-foreground">المراحل: {Object.values(STAGES).join(" · ")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
