import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Wrench, AlertTriangle, Cpu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChannelBadge, EmptyState, PageHeader, Skeleton, selectCls } from "@/components/admin";
import { TICKET_STATUSES, TICKET_CLS, ago } from "@/lib/crm";

export const Route = createFileRoute("/_team/tickets")({
  head: () => ({
    meta: [
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
  const { data = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => (await supabase.from("tickets").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const setStatus = async (id: string, status: string) => {
    await supabase.from("tickets").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tickets"] });
    qc.invalidateQueries({ queryKey: ["nav-badges"] });
  };
  const list = f === "all" ? data : data.filter((t) => t.status === f);
  return (
    <div className="space-y-4">
      <PageHeader title="تذاكر الدعم الفني" count={list.length} description="بلاغات الصيانة الواردة من العملاء عبر البوت" />
      <div className="flex gap-1.5">
        {[["all", "الكل"], ...Object.entries(TICKET_STATUSES)].map(([k, l]) => (
          <button key={k} onClick={() => setF(k)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium ${f === k ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}>
            {l} <span className="tabular-nums opacity-70">{k === "all" ? data.length : data.filter((t) => t.status === k).length}</span>
          </button>
        ))}
      </div>
      {isLoading && <div className="grid gap-3 md:grid-cols-2">{[1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>}
      {!isLoading && list.length === 0 && (
        <div className="rounded-xl border bg-card shadow-card"><EmptyState icon={Wrench} title="لا توجد تذاكر" hint="ستظهر بلاغات الصيانة هنا فور تسجيلها من البوت." /></div>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((t) => {
          const urgent = /طارئ/.test(t.issue_type ?? "");
          return (
            <article key={t.id} className={`flex flex-col rounded-xl border bg-card shadow-card ${urgent ? "border-destructive/40" : ""}`}>
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <span dir="ltr" className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold">{t.ticket_no}</span>
                {urgent && <span className="flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive"><AlertTriangle className="h-3 w-3" /> طارئ</span>}
                <span className={`ms-auto rounded-md px-2 py-0.5 text-[11px] font-semibold ${TICKET_CLS[t.status] ?? ""}`}>{TICKET_STATUSES[t.status] ?? t.status}</span>
              </div>
              <div className="space-y-2 p-4 text-sm">
                <div className="flex items-center gap-2">
                  <Link to="/customers/$phone" params={{ phone: t.phone }} className="font-bold hover:text-primary">{t.name || t.phone}</Link>
                  <ChannelBadge phone={t.phone} />
                  <span className="ms-auto text-[11px] tabular-nums text-muted-foreground">{ago(t.created_at)}</span>
                </div>
                {(t.device || t.issue_type) && (
                  <p className="flex items-center gap-1.5 text-xs font-medium"><Cpu className="h-3.5 w-3.5 text-muted-foreground" /> {[t.device, t.issue_type].filter(Boolean).join(" — ")}</p>
                )}
                {t.description && <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{t.description}</p>}
              </div>
              <div className="mt-auto flex items-center gap-2 border-t bg-muted/30 px-4 py-2.5">
                <span className="text-xs text-muted-foreground">الحالة</span>
                <select value={t.status} onChange={(e) => setStatus(t.id, e.target.value)} className={`${selectCls} ms-auto`}>
                  {Object.entries(TICKET_STATUSES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
