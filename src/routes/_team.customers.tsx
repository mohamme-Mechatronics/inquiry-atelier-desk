import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Search, Users, Headset } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar, ChannelBadge, EmptyState, PageHeader, Panel, Skeleton } from "@/components/admin";
import { STATUSES, STAGES, CHANNELS, channelOf, fmt, ago, preview } from "@/lib/crm";

export const Route = createFileRoute("/_team/customers")({
  head: () => ({
    meta: [
      { title: "العملاء — تمكين" },
      { name: "description", content: "قائمة عملاء واتساب وتليجرام وحالة كل عميل" },
      { property: "og:title", content: "العملاء — تمكين" },
      { property: "og:description", content: "قائمة عملاء واتساب وتليجرام وحالة كل عميل" },
    ],
  }),
  component: Customers,
});

function Customers() {
  const [q, setQ] = useState("");
  const [st, setSt] = useState("all");
  const { data = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await supabase.from("customers").select("*").order("last_at", { ascending: false }).limit(1000)).data ?? [],
    refetchInterval: 30000,
  });
  const list = data.filter(
    (c) => (st === "all" || c.status === st) && (!q || `${c.phone} ${c.name ?? ""} ${c.city ?? ""}`.includes(q)),
  );
  const countOf = (k: string) => (k === "all" ? data.length : data.filter((c) => c.status === k).length);

  // Excel opens UTF-8 CSV with BOM correctly, including Arabic text.
  const exportExcel = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["الاسم", "الرقم", "القناة", "المدينة", "المنظومة", "الحالة", "المرحلة", "آخر رسالة", "آخر تواصل", "تاريخ التسجيل"],
      ...list.map((c) => [
        c.name, c.phone, CHANNELS[channelOf(c.phone)].label, c.city, c.system,
        STATUSES[c.status]?.label ?? c.status, c.stage ? STAGES[c.stage] ?? c.stage : "", c.last_message,
        fmt(c.last_at), fmt(c.created_at),
      ]),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `tamkeen-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="العملاء" count={list.length} description="كل من راسل البوت على واتساب أو تليجرام"
        actions={<Button variant="outline" size="sm" onClick={exportExcel} disabled={!list.length}><Download className="h-4 w-4" /> تصدير Excel</Button>} />

      <Panel>
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input placeholder="بحث بالاسم أو الرقم أو المدينة" value={q} onChange={(e) => setQ(e.target.value)}
              className="h-9 w-full rounded-lg border bg-background pe-3 ps-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="scrollbar-none flex gap-1 overflow-x-auto sm:ms-auto">
            {[["all", "الكل"], ...Object.entries(STATUSES).map(([k, v]) => [k, v.label])].map(([k, l]) => (
              <button key={k} onClick={() => setSt(k as string)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${st === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {l} <span className="tabular-nums opacity-70">{countOf(k as string)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_7rem] gap-3 border-b bg-muted/50 px-4 py-2 text-[11px] font-semibold text-muted-foreground lg:grid">
          <span>العميل</span><span>المدينة / المنظومة</span><span>المرحلة</span><span>الحالة</span><span className="text-end">آخر تواصل</span>
        </div>
        {isLoading && <div className="space-y-3 p-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}</div>}
        {!isLoading && list.length === 0 && <EmptyState icon={Users} title="لا يوجد عملاء" hint="سيظهر العملاء هنا عند مراسلة البوت." />}
        <ul className="divide-y">
          {list.map((c) => (
            <li key={c.phone}>
              <Link to="/customers/$phone" params={{ phone: c.phone }}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 lg:grid lg:grid-cols-[2fr_1fr_1fr_1fr_7rem]">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={c.name} phone={c.phone} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{c.name || "بدون اسم"}</span>
                      {c.bot_paused && <Headset className="h-3.5 w-3.5 shrink-0 text-warning-foreground" aria-label="رد يدوي" />}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ChannelBadge phone={c.phone} /><span dir="ltr" className="tabular-nums">{c.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="hidden min-w-0 text-sm lg:block">
                  <div className="truncate">{c.city || "—"}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.system || ""}</div>
                </div>
                <span className="hidden text-sm text-muted-foreground lg:block">{c.stage ? STAGES[c.stage] ?? c.stage : "—"}</span>
                <span className="hidden lg:block"><StatusBadge status={c.status} /></span>
                <div className="flex shrink-0 flex-col items-end gap-1 lg:block lg:text-end">
                  <span className="lg:hidden"><StatusBadge status={c.status} /></span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{ago(c.last_at)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
