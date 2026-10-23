import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Wrench, AlertTriangle, Cpu, Search, ArrowRight, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, ChannelBadge, EmptyState, Skeleton, selectCls } from "@/components/admin";
import { TICKET_STATUSES, TICKET_CLS, ago, fmt } from "@/lib/crm";
import { ExportButtons } from "@/components/ExportButtons";

export const Route = createFileRoute("/_team/tickets")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "الدعم الفني — تمكين" },
      { name: "description", content: "تذاكر الدعم الفني الواردة من البوت" },
      { property: "og:title", content: "الدعم الفني — تمكين" },
      { property: "og:description", content: "تذاكر الدعم الفني الواردة من البوت" },
    ],
  }),
  component: Tickets,
});

function Tickets() {
  const qc = useQueryClient();
  const [f, setF] = useState("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => (await supabase.from("tickets").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const setStatus = async (id: string, status: string) => {
    await supabase.from("tickets").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tickets"] });
    qc.invalidateQueries({ queryKey: ["nav-badges"] });
  };
  const s = q.trim();
  const list = data
    .filter((t) => f === "all" || t.status === f)
    .filter((t) => !s || `${t.name ?? ""} ${t.phone} ${t.ticket_no ?? ""} ${t.device ?? ""}`.includes(s));
  const t = data.find((x) => x.id === sel);
  const table = () => ({
    title: "تقرير الدعم الفني", file: "support",
    headers: ["رقم التذكرة", "العميل", "الرقم", "الجهاز", "نوع المشكلة", "الوصف", "الحالة", "التاريخ"],
    rows: list.map((t) => [t.ticket_no, t.name, t.phone, t.device, t.issue_type, t.description, TICKET_STATUSES[t.status] ?? t.status, fmt(t.created_at)]),
  });
  return (
    <div className="grid h-[calc(100dvh-9.25rem)] grid-cols-1 overflow-hidden rounded-xl border bg-card shadow-card md:h-[calc(100dvh-7rem)] md:grid-cols-[22rem_1fr]">
      <div className={`flex min-h-0 min-w-0 flex-col border-e ${t ? "hidden md:flex" : "flex"}`}>
        <div className="space-y-3 border-b p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الرقم أو التذكرة"
                className="h-9 w-full rounded-lg border bg-background pe-3 ps-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <ExportButtons table={table} />
          </div>
          <div className="scrollbar-none -mx-3 flex gap-1 overflow-x-auto px-3">
            {[["all", "الكل"], ...Object.entries(TICKET_STATUSES)].map(([k, l]) => (
              <button key={k} onClick={() => setF(k as string)}
                className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${f === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {l} <span className="tabular-nums opacity-70">{k === "all" ? data.length : data.filter((x) => x.status === k).length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && <div className="space-y-3 p-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14" />)}</div>}
          {!isLoading && list.length === 0 && <EmptyState icon={Wrench} title="لا توجد تذاكر" hint="ستظهر بلاغات الصيانة هنا فور تسجيلها من البوت." />}
          {list.map((x) => {
            const urgent = /طارئ/.test(x.issue_type ?? "");
            return (
              <button key={x.id} onClick={() => setSel(x.id)}
                className={`relative flex w-full items-center gap-3 border-b px-3 py-3 text-start transition-colors hover:bg-muted/60 ${sel === x.id ? "bg-secondary before:absolute before:inset-y-0 before:start-0 before:w-0.5 before:bg-accent" : ""}`}>
                <Avatar name={x.name} phone={x.phone} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{x.name || x.phone}</span>
                    {urgent && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />}
                    <span className="ms-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">{ago(x.created_at)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="truncate">{[x.device, x.issue_type].filter(Boolean).join(" — ") || x.ticket_no}</span>
                    <span className={`ms-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${TICKET_CLS[x.status] ?? ""}`}>{TICKET_STATUSES[x.status] ?? x.status}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`min-h-0 min-w-0 flex-col ${t ? "flex" : "hidden md:flex"}`}>
        {!t ? (
          <div className="m-auto"><EmptyState icon={Wrench} title="اختر تذكرة لعرضها" hint="اختر بلاغًا من القائمة لعرض تفاصيله وتحديث حالته." /></div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b px-3 py-2.5">
              <button onClick={() => setSel(null)} className="rounded-full p-1.5 hover:bg-muted md:hidden" aria-label="رجوع"><ArrowRight className="h-5 w-5" /></button>
              <Avatar name={t.name} phone={t.phone} size="sm" />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm font-bold">{t.name || t.phone}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><ChannelBadge phone={t.phone} /> <span dir="ltr">{t.ticket_no}</span></div>
              </div>
              <Link to="/chats" search={{ p: t.phone }} className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="فتح المحادثة"><MessageCircle className="h-5 w-5" /></Link>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
              {/طارئ/.test(t.issue_type ?? "") && <p className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive"><AlertTriangle className="h-4 w-4" /> بلاغ طارئ</p>}
              {(t.device || t.issue_type) && <p className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-2 text-xs font-medium"><Cpu className="h-3.5 w-3.5 text-muted-foreground" /> {[t.device, t.issue_type].filter(Boolean).join(" — ")}</p>}
              {t.description && <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs leading-relaxed">{t.description}</p>}
              <p className="text-[11px] text-muted-foreground">{fmt(t.created_at)}</p>
            </div>
            <div className="flex items-center gap-2 border-t bg-muted/30 px-3 py-2.5">
              <span className="text-xs text-muted-foreground">الحالة</span>
              <select value={t.status} onChange={(e) => setStatus(t.id, e.target.value)} className={`${selectCls} ms-auto`}>
                {Object.entries(TICKET_STATUSES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
