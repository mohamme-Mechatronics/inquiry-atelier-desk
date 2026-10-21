import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STATUSES, fmt } from "@/lib/crm";

export const Route = createFileRoute("/_team/orders")({
  head: () => ({
    meta: [
      { title: "الطلبات — تمكين" },
      { name: "description", content: "طلبات الشراء والفواتير الواردة من البوت" },
      { property: "og:title", content: "الطلبات — تمكين" },
      { property: "og:description", content: "طلبات الشراء والفواتير الواردة من البوت" },
    ],
  }),
  component: Orders,
});

function Orders() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const setStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["orders"] });
  };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">طلبات الشراء</h1>
      {data.length === 0 && <p className="rounded-xl bg-card p-6 text-center text-muted-foreground">لا توجد طلبات بعد.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {data.map((o) => (
          <div key={o.id} className="space-y-1 rounded-xl bg-card p-4 text-sm shadow-sm">
            <div className="flex items-center justify-between">
              <Link to="/customers/$phone" params={{ phone: o.phone }} className="font-bold text-primary">{o.name || o.phone}</Link>
              <span className="text-xs text-muted-foreground">{fmt(o.created_at)}</span>
            </div>
            <p>المدينة: {o.city || "—"} · الفاتورة: {o.invoice_no || "—"}</p>
            <p>المبلغ: <b>{o.amount || "—"}</b> · طريقة الدفع: {o.method || "—"}</p>
            {o.details && <details><summary className="cursor-pointer text-muted-foreground">التفاصيل</summary><p className="whitespace-pre-wrap">{o.details}</p></details>}
            <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className="mt-1 rounded-md border bg-background px-2 py-1">
              {Object.entries(STATUSES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
