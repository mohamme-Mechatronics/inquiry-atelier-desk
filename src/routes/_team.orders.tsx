import { useTeam } from "@/lib/team";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShoppingCart, MapPin, Receipt, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, ChannelBadge, EmptyState, PageHeader, Skeleton, selectCls } from "@/components/admin";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUSES, ago, fmt } from "@/lib/crm";
import { ExportButtons } from "@/components/ExportButtons";

export const Route = createFileRoute("/_team/orders")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const { data = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false })).data ?? [],
    refetchInterval: 20000,
  });
  const team = useTeam();
  const assign = async (id: string, v: string) => {
    await supabase.from("orders").update({ assigned_to: v || null }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["orders"] });
  };
  const setStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["nav-badges"] });
  };
  const re = CATS.find((c) => c[0] === cat)?.[2];
  const list = re ? data.filter((o) => re.test(`${o.details ?? ""} ${o.method ?? ""} ${o.invoice_no ?? ""}`)) : data;
  const table = () => ({
    title: `تقرير الطلبات — ${CATS.find((c) => c[0] === cat)?.[1]}`, file: "orders",
    headers: ["العميل", "الرقم", "المبلغ", "الفاتورة", "المدينة", "طريقة الدفع", "الحالة", "التفاصيل", "التاريخ"],
    rows: list.map((o) => [o.name, o.phone, o.amount, o.invoice_no, o.city, o.method, STATUSES[o.status]?.label ?? o.status, o.details, fmt(o.created_at)]),
  });
  return (
    <div className="space-y-4">
      <PageHeader title="الطلبات" count={list.length} description="طلبات الشراء والدفع الواردة من البوت، صنّفها وحدّث حالتها" actions={<ExportButtons table={table} />} />
      <div className="scrollbar-none -mx-3 flex gap-1.5 overflow-x-auto px-3 md:mx-0 md:flex-wrap md:px-0">
        {CATS.map(([k, l]) => (
          <button key={k} onClick={() => setCat(k)}
            className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${cat === k ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}>
            {l}
          </button>
        ))}
      </div>
      {isLoading && <div className="grid gap-3 md:grid-cols-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40" />)}</div>}
      {!isLoading && list.length === 0 && (
        <div className="rounded-xl border bg-card shadow-card"><EmptyState icon={ShoppingCart} title="لا توجد طلبات" hint="ستصل طلبات الشراء هنا عند إتمامها من البوت." /></div>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((o) => (
          <article key={o.id} className="flex flex-col rounded-xl border bg-card shadow-card">
            <div className="flex items-center gap-3 border-b p-4">
              <Avatar name={o.name} phone={o.phone} size="sm" />
              <div className="min-w-0 flex-1">
                <Link to="/customers/$phone" params={{ phone: o.phone }} className="block truncate text-sm font-bold hover:text-primary">{o.name || o.phone}</Link>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><ChannelBadge phone={o.phone} /> {ago(o.created_at)}</div>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <dl className="grid grid-cols-2 gap-3 p-4 text-sm">
              <div><dt className="flex items-center gap-1 text-[11px] text-muted-foreground"><Wallet className="h-3 w-3" /> المبلغ</dt><dd className="font-bold tabular-nums">{o.amount || "—"}</dd></div>
              <div><dt className="flex items-center gap-1 text-[11px] text-muted-foreground"><Receipt className="h-3 w-3" /> الفاتورة</dt><dd dir="ltr" className="truncate text-end font-medium">{o.invoice_no || "—"}</dd></div>
              <div><dt className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" /> المدينة</dt><dd>{o.city || "—"}</dd></div>
              <div><dt className="text-[11px] text-muted-foreground">طريقة الدفع</dt><dd className="truncate">{o.method || "—"}</dd></div>
            </dl>
            {o.details && (
              <details className="mx-4 mb-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">تفاصيل الطلب</summary>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed">{o.details}</p>
              </details>
            )}
            <div className="mt-auto flex items-center gap-2 border-t bg-muted/30 px-4 py-2.5">
              <span className="text-xs text-muted-foreground">تحديث الحالة</span>
              <select value={o.assigned_to ?? ""} onChange={(e) => assign(o.id, e.target.value)} className={selectCls} aria-label="الموظف المسؤول">
                <option value="">غير مسند</option>
                {team.data?.map((t) => <option key={t.user_id} value={t.user_id}>{t.email?.split("@")[0]}</option>)}
              </select>
              <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className={`${selectCls} ms-auto`}>
                {Object.entries(STATUSES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
