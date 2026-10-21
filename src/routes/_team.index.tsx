import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STATUSES } from "@/lib/crm";

export const Route = createFileRoute("/_team/")({
  head: () => ({
    meta: [
      { title: "التقارير — تمكين" },
      { name: "description", content: "ملخص العملاء والطلبات والمبيعات من بوت واتساب" },
      { property: "og:title", content: "التقارير — تمكين" },
      { property: "og:description", content: "ملخص العملاء والطلبات والمبيعات من بوت واتساب" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 864e5).toISOString();
      const [c, o, t, q, w] = await Promise.all([
        supabase.from("customers").select("status"),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("tickets").select("id", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("stage", "quote").eq("kind", "document"),
        supabase.from("customers").select("id:phone", { count: "exact", head: true }).gte("created_at", since),
      ]);
      const byStatus: Record<string, number> = {};
      for (const r of c.data ?? []) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      return { customers: c.data?.length ?? 0, byStatus, orders: o.count ?? 0, tickets: t.count ?? 0, quotes: q.count ?? 0, week: w.count ?? 0 };
    },
  });
  const cards = [
    { label: "كل العملاء", v: data?.customers, to: "/customers" },
    { label: "عملاء هذا الأسبوع", v: data?.week, to: "/customers" },
    { label: "طلبات الشراء", v: data?.orders, to: "/orders" },
    { label: "عروض الأسعار المرسلة", v: data?.quotes, to: "/quotes" },
    { label: "تذاكر دعم مفتوحة", v: data?.tickets, to: "/tickets" },
  ] as const;
  const total = data?.customers || 1;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">التقارير والأرقام</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="rounded-xl border-b-4 border-accent bg-card p-4 shadow-sm">
            <div className="text-3xl font-extrabold text-primary">{c.v ?? "—"}</div>
            <div className="mt-1 text-sm text-muted-foreground">{c.label}</div>
          </Link>
        ))}
      </div>
      <div className="rounded-xl bg-card p-4 shadow-sm">
        <h2 className="mb-3 font-bold">حالة العملاء</h2>
        <div className="space-y-2">
          {Object.entries(STATUSES).map(([k, s]) => {
            const n = data?.byStatus[k] ?? 0;
            return (
              <div key={k} className="flex items-center gap-3">
                <span className="w-28 text-sm">{s.label}</span>
                <div className="h-3 flex-1 rounded-full bg-muted">
                  <div className="h-3 rounded-full bg-primary" style={{ width: `${(n / total) * 100}%` }} />
                </div>
                <span className="w-8 text-left text-sm font-bold">{n}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
