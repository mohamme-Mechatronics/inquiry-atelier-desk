import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUSES, STAGES, CHANNELS, channelOf, fmt } from "@/lib/crm";

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
  const { data = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await supabase.from("customers").select("*").order("last_at", { ascending: false }).limit(1000)).data ?? [],
    refetchInterval: 30000,
  });
  const list = data.filter(
    (c) => (st === "all" || c.status === st) && (!q || `${c.phone} ${c.name ?? ""} ${c.city ?? ""}`.includes(q)),
  );

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
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-extrabold">العملاء ({list.length})</h1>
        <Button variant="outline" size="sm" className="ms-auto" onClick={exportExcel} disabled={!list.length}>
          <Download className="h-4 w-4" /> تصدير Excel
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input placeholder="بحث بالاسم أو الرقم أو المدينة" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        {[["all", "الكل"], ...Object.entries(STATUSES).map(([k, v]) => [k, v.label])].map(([k, l]) => (
          <button key={k} onClick={() => setSt(k as string)} className={`rounded-full px-3 py-1 text-sm ${st === k ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            {l}
          </button>
        ))}
      </div>
      <div className="divide-y rounded-xl bg-card shadow-sm">
        {list.length === 0 && <p className="p-6 text-center text-muted-foreground">لا يوجد عملاء بعد. سيظهرون هنا عند مراسلة البوت.</p>}
        {list.map((c) => (
          <Link key={c.phone} to="/customers/$phone" params={{ phone: c.phone }} className="flex items-center gap-3 p-3 hover:bg-muted">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 font-bold">
                {c.name || "بدون اسم"} <span dir="ltr" className="text-xs font-normal text-muted-foreground">{c.phone}</span>
                <span className={`rounded px-1.5 text-[10px] font-normal ${CHANNELS[channelOf(c.phone)].cls}`}>{CHANNELS[channelOf(c.phone)].label}</span>
                {c.bot_paused && <span className="rounded bg-destructive px-1.5 text-xs text-destructive-foreground">البوت موقوف</span>}
              </div>
              <div className="truncate text-sm text-muted-foreground">{c.city ? `${c.city} · ` : ""}{c.last_message}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusBadge status={c.status} />
              <span className="text-xs text-muted-foreground">{c.stage ? STAGES[c.stage] ?? c.stage : ""} · {fmt(c.last_at)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
