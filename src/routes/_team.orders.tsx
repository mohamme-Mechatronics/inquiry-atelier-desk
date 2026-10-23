import { useTeam } from "@/lib/team";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShoppingCart, MapPin, Receipt, Wallet, Search, ArrowRight, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, ChannelBadge, EmptyState, Skeleton, selectCls } from "@/components/admin";
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
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
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
  const s = q.trim();
  const list = data
    .filter((o) => !re || re.test(`${o.details ?? ""} ${o.method ?? ""} ${o.invoice_no ?? ""}`))
    .filter((o) => !s || `${o.name ?? ""} ${o.phone} ${o.invoice_no ?? ""} ${o.city ?? ""}`.includes(s));
  const o = data.find((x) => x.id === sel);
  const table = () => ({
    title: `تقرير الطلبات — ${CATS.find((c) => c[0] === cat)?.[1]}`, file: "orders",
    headers: ["العميل", "الرقم", "المبلغ", "الفاتورة", "المدينة", "طريقة الدفع", "الحالة", "التفاصيل", "التاريخ"],
    rows: list.map((o) => [o.name, o.phone, o.amount, o.invoice_no, o.city, o.method, STATUSES[o.status]?.label ?? o.status, o.details, fmt(o.created_at)]),
  });
  return (
    <div className="grid h-[calc(100dvh-9.25rem)] grid-cols-1 overflow-hidden rounded-xl border bg-card shadow-card md:h-[calc(100dvh-7rem)] md:grid-cols-[22rem_1fr]">
      <div className={`flex min-h-0 min-w-0 flex-col border-e ${o ? "hidden md:flex" : "flex"}`}>
        <div className="space-y-3 border-b p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الرقم أو الفاتورة"
                className="h-9 w-full rounded-lg border bg-background pe-3 ps-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <ExportButtons table={table} />
          </div>
          <div className="scrollbar-none -mx-3 flex gap-1 overflow-x-auto px-3">
            {CATS.map(([k, l]) => (
              <button key={k} onClick={() => setCat(k)}
                className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${cat === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && <div className="space-y-3 p-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14" />)}</div>}
          {!isLoading && list.length === 0 && <EmptyState icon={ShoppingCart} title="لا توجد طلبات" hint="ستصل طلبات الشراء هنا عند إتمامها من البوت." />}
          {list.map((x) => (
            <button key={x.id} onClick={() => setSel(x.id)}
              className={`relative flex w-full items-center gap-3 border-b px-3 py-3 text-start transition-colors hover:bg-muted/60 ${sel === x.id ? "bg-secondary before:absolute before:inset-y-0 before:start-0 before:w-0.5 before:bg-accent" : ""}`}>
              <Avatar name={x.name} phone={x.phone} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{x.name || x.phone}</span>
                  <span className="ms-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">{ago(x.created_at)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span dir="ltr" className="truncate">{x.invoice_no || "—"}</span>
                  {x.amount && <span className="font-semibold tabular-nums text-foreground">{x.amount}</span>}
                  <span className="ms-auto shrink-0"><StatusBadge status={x.status} /></span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={`min-h-0 min-w-0 flex-col ${o ? "flex" : "hidden md:flex"}`}>
        {!o ? (
          <div className="m-auto"><EmptyState icon={ShoppingCart} title="اختر طلبًا لعرضه" hint="اختر طلبًا من القائمة لعرض تفاصيله وتحديث حالته." /></div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b px-3 py-2.5">
              <button onClick={() => setSel(null)} className="rounded-full p-1.5 hover:bg-muted md:hidden" aria-label="رجوع"><ArrowRight className="h-5 w-5" /></button>
              <Avatar name={o.name} phone={o.phone} size="sm" />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm font-bold">{o.name || o.phone}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><ChannelBadge phone={o.phone} /> <span dir="ltr">{o.phone}</span></div>
              </div>
              <Link to="/chats" search={{ p: o.phone }} className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="فتح المحادثة"><MessageCircle className="h-5 w-5" /></Link>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {[
                  [Wallet, "المبلغ", o.amount],
                  [Receipt, "الفاتورة", o.invoice_no],
                  [MapPin, "المدينة", o.city],
                  [Wallet, "طريقة الدفع", o.method],
                ].map(([I, l, v], i) => {
                  const Icon = I as typeof Wallet;
                  return (
                    <div key={i} className="rounded-lg bg-muted/50 px-2.5 py-1.5">
                      <dt className="flex items-center gap-1 text-[11px] text-muted-foreground"><Icon className="h-3 w-3" /> {l as string}</dt>
                      <dd className="truncate font-semibold">{(v as string) || "—"}</dd>
                    </div>
                  );
                })}
              </dl>
              {o.details && <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs leading-relaxed">{o.details}</p>}
              <p className="text-[11px] text-muted-foreground">{fmt(o.created_at)}</p>
            </div>
            <div className="flex items-center gap-2 border-t bg-muted/30 px-3 py-2.5">
              <select value={o.assigned_to ?? ""} onChange={(e) => assign(o.id, e.target.value)} className={selectCls} aria-label="الموظف المسؤول">
                <option value="">غير مسند</option>
                {team.data?.map((t) => <option key={t.user_id} value={t.user_id}>{t.email?.split("@")[0]}</option>)}
              </select>
              <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className={`${selectCls} ms-auto`}>
                {Object.entries(STATUSES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
