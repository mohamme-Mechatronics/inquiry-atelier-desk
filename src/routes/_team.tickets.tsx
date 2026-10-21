import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TICKET_STATUSES, fmt } from "@/lib/crm";

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
  const { data = [] } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => (await supabase.from("tickets").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const setStatus = async (id: string, status: string) => {
    await supabase.from("tickets").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tickets"] });
  };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">تذاكر الدعم الفني</h1>
      {data.length === 0 && <p className="rounded-xl bg-card p-6 text-center text-muted-foreground">لا توجد تذاكر.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {data.map((t) => (
          <div key={t.id} className={`space-y-1 rounded-xl bg-card p-4 text-sm shadow-sm ${/طارئ/.test(t.issue_type ?? "") ? "border-s-4 border-destructive" : ""}`}>
            <div className="flex justify-between"><b dir="ltr">{t.ticket_no}</b><span className="text-xs text-muted-foreground">{fmt(t.created_at)}</span></div>
            <Link to="/customers/$phone" params={{ phone: t.phone }} className="text-primary">{t.name || t.phone}</Link>
            <p>{t.device} — {t.issue_type}</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{t.description}</p>
            <select value={t.status} onChange={(e) => setStatus(t.id, e.target.value)} className="rounded-md border bg-background px-2 py-1">
              {Object.entries(TICKET_STATUSES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
