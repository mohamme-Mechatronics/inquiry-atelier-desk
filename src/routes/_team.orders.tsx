import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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

// Order categories are matched from the words the bot writes into the order text.
const CATS: [string, string, RegExp | null][] = [
  ["all", "الكل", null],
  ["quote", "عرض سعر", /عرض|quote|TMK-/i],
  ["study", "دراسة PVsyst", /دراس|pvsyst|study/i],
  ["sld", "مخطط كهربائي", /مخطط|sld/i],
  ["maint", "صيانة", /صيان/],
  ["visit", "زيارة ميدانية", /زيار/],
  ["pay", "دفع", /دفع|تحويل|حوالة|cod/i],
  ["upgrade", "ترقية", /ترقي/],
  ["home", "سكني", /سكن|منزل/],
  ["biz", "تجاري", /تجار/],
  ["ind", "صناعي", /صناع|مصنع/],
  ["agri", "زراعي / غطاسات", /زراع|غطاس|مضخ|عطاس/],
  ["inst", "تقسيط", /تقسيط|أقساط/],
];

function Orders() {
  const qc = useQueryClient();
  const [cat, setCat] = useState("all");
  const { data = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false })).data ?? [],
    refetchInterval: 20000,
  });
  const setStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["orders"] });
  };
  const re = CATS.find((c) => c[0] === cat)?.[2];
  const list = re ? data.filter((o) => re.test(`${o.details ?? ""} ${o.method ?? ""} ${o.invoice_no ?? ""}`)) : data;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">الطلبات ({list.length})</h1>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {CATS.map(([k, l]) => (
          <button key={k} onClick={() => setCat(k)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs ${cat === k ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
            {l}
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="rounded-xl bg-card p-6 text-center text-muted-foreground">لا توجد طلبات.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((o) => (
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
