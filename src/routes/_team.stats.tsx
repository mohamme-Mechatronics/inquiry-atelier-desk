import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, MapPin, Sun, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, EmptyState, Skeleton } from "@/components/admin";

export const Route = createFileRoute("/_team/stats")({
  head: () => ({
    meta: [
      { title: "الإحصائيات — تمكين" },
      { name: "description", content: "رسوم بيانية للمبيعات حسب نوع النظام والمدينة ونسبة الإنجاز الشهرية" },
      { property: "og:title", content: "الإحصائيات — تمكين" },
      { property: "og:description", content: "رسوم بيانية للمبيعات حسب نوع النظام والمدينة ونسبة الإنجاز الشهرية" },
    ],
  }),
  component: Stats,
});

const COLORS = ["var(--primary)", "var(--accent)", "var(--success)", "var(--info)", "var(--destructive)", "var(--warning)"];
const top = (m: Record<string, number>, n = 8) =>
  Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, value]) => ({ name, value }));

function Stats() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats-charts"],
    queryFn: async () => {
      const [c, o] = await Promise.all([
        supabase.from("customers").select("system,city,created_at").limit(5000),
        supabase.from("orders").select("status,city,details,created_at").limit(5000),
      ]);
      const sys: Record<string, number> = {}, city: Record<string, number> = {};
      for (const r of c.data ?? []) {
        if (r.system) sys[r.system] = (sys[r.system] ?? 0) + 1;
        if (r.city) city[r.city] = (city[r.city] ?? 0) + 1;
      }
      const months: Record<string, { m: string; total: number; done: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
        const k = d.toISOString().slice(0, 7);
        months[k] = { m: d.toLocaleDateString("ar", { month: "short" }), total: 0, done: 0 };
      }
      for (const r of o.data ?? []) {
        const k = r.created_at.slice(0, 7);
        if (!months[k]) continue;
        months[k].total++;
        if (r.status === "done" || r.status === "closed" || r.status === "won") months[k].done++;
      }
      const monthly = Object.values(months).map((x) => ({ ...x, rate: x.total ? Math.round((x.done / x.total) * 100) : 0 }));
      return { sys: top(sys, 6), city: top(city), monthly };
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="الإحصائيات" description="أداء المبيعات حسب نوع النظام والمدينة والشهر" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="المبيعات حسب نوع النظام" icon={Sun} bodyClass="p-3">
          {isLoading ? <Skeleton className="h-56" /> : !data?.sys.length ? <EmptyState icon={Sun} title="لا توجد بيانات بعد" /> : (
            <div className="h-60">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.sys} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {data.sys.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
            {data?.sys.map((s, i) => (
              <li key={s.name} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="truncate">{s.name}</span><b className="ms-auto tabular-nums">{s.value}</b></li>
            ))}
          </ul>
        </Panel>
        <Panel title="أكثر المدن طلباً" icon={MapPin} bodyClass="p-3">
          {isLoading ? <Skeleton className="h-56" /> : !data?.city.length ? <EmptyState icon={MapPin} title="لا توجد بيانات بعد" /> : (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={data.city} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} fontSize={11} />
                  <YAxis type="category" dataKey="name" width={80} fontSize={11} orientation="right" />
                  <Tooltip />
                  <Bar dataKey="value" name="عملاء" fill="var(--primary)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
        <Panel title="الطلبات الشهرية" icon={BarChart3} bodyClass="p-3">
          {isLoading ? <Skeleton className="h-56" /> : (
            <div className="h-60">
              <ResponsiveContainer>
                <BarChart data={data?.monthly ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="m" fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} width={28} />
                  <Tooltip />
                  <Bar dataKey="total" name="كل الطلبات" fill="var(--primary)" radius={4} />
                  <Bar dataKey="done" name="مكتملة" fill="var(--accent)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
        <Panel title="نسبة الإنجاز الشهرية" icon={TrendingUp} bodyClass="space-y-3 p-4">
          {data?.monthly.map((m) => (
            <div key={m.m} className="space-y-1">
              <div className="flex justify-between text-sm"><span>{m.m}</span><b className="tabular-nums">{m.rate}%</b></div>
              <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-success" style={{ width: `${m.rate}%` }} /></div>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
