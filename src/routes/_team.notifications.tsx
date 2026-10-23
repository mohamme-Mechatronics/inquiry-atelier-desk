import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, ShoppingCart, Wrench, Headset, UserPlus, ArrowUpLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState, ChannelBadge, Skeleton } from "@/components/admin";
import { channelOf, ago, preview } from "@/lib/crm";

export const Route = createFileRoute("/_team/notifications")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "الإشعارات — تمكين" },
      { name: "description", content: "كل الإشعارات الواردة من البوت: الطلبات وبلاغات الصيانة والعملاء" },
      { property: "og:title", content: "الإشعارات — تمكين" },
      { property: "og:description", content: "كل الإشعارات الواردة من البوت: الطلبات وبلاغات الصيانة والعملاء" },
    ],
  }),
  component: Notifications,
});

type Kind = "order" | "ticket" | "human" | "new";
type Note = { key: string; kind: Kind; title: string; sub: string; at: string; phone: string };

const KINDS: { key: Kind | "all"; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "order", label: "طلبات" },
  { key: "ticket", label: "بلاغات صيانة" },
  { key: "human", label: "تحتاج موظف" },
  { key: "new", label: "عملاء جدد" },
];

const ICONS: Record<Kind, { icon: typeof Bell; cls: string }> = {
  order: { icon: ShoppingCart, cls: "bg-success/10 text-success" },
  ticket: { icon: Wrench, cls: "bg-destructive/10 text-destructive" },
  human: { icon: Headset, cls: "bg-warning/15 text-warning-foreground" },
  new: { icon: UserPlus, cls: "bg-info/10 text-info" },
};

function Notifications() {
  const [filter, setFilter] = useState<Kind | "all">("all");
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [c, o, t] = await Promise.all([
        supabase.from("customers").select("phone,name,status,stage,last_at,last_message,created_at").order("last_at", { ascending: false }).limit(1000),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(30),
        supabase.from("tickets").select("*").order("created_at", { ascending: false }).limit(30),
      ]);
      const cs = c.data ?? [];
      const iso = today.toISOString();
      const notes: Note[] = [
        ...(o.data ?? []).map((x): Note => ({ key: "o" + x.id, kind: "order", title: `طلب شراء — ${x.name || x.phone}`, sub: `${x.amount || ""} ${x.method || ""}`.trim(), at: x.created_at, phone: x.phone })),
        ...(t.data ?? []).map((x): Note => ({ key: "t" + x.id, kind: "ticket", title: `بلاغ صيانة ${x.ticket_no} — ${x.name || x.phone}`, sub: x.issue_type || x.description || "", at: x.created_at, phone: x.phone })),
        ...cs.filter((x) => x.stage === "human").slice(0, 10).map((x): Note => ({ key: "h" + x.phone, kind: "human", title: `يحتاج موظف — ${x.name || x.phone}`, sub: x.last_message || "", at: x.last_at, phone: x.phone })),
        ...cs.filter((x) => x.created_at >= iso).slice(0, 10).map((x): Note => ({ key: "n" + x.phone, kind: "new", title: `عميل جديد — ${x.name || x.phone}`, sub: x.last_message || "", at: x.created_at, phone: x.phone })),
      ].sort((a, b) => (a.at < b.at ? 1 : -1));
      return notes;
    },
    refetchInterval: 20000,
  });

  const notes = (data ?? []).filter((n) => filter === "all" || n.kind === filter);
  const counts: Record<string, number> = {};
  for (const n of data ?? []) counts[n.kind] = (counts[n.kind] ?? 0) + 1;

  return (
    <div className="space-y-4">
      <PageHeader title="الإشعارات" description="كل ما يصل من البوت: طلبات، بلاغات صيانة، وعملاء بحاجة لمتابعة" />

      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button key={k.key} onClick={() => setFilter(k.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${filter === k.key ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
            {k.label}
            {k.key !== "all" && counts[k.key] ? <span className="ms-1 tabular-nums opacity-70">{counts[k.key]}</span> : null}
          </button>
        ))}
      </div>

      {isLoading && <div className="space-y-2 rounded-xl border bg-card p-4 shadow-card">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10" />)}</div>}
      {!isLoading && !notes.length && (
        <div className="rounded-xl border bg-card shadow-card">
          <EmptyState icon={Bell} title="لا توجد إشعارات" hint="ستظهر هنا الطلبات وبلاغات الصيانة والعملاء الجدد فور وصولها من البوت." />
        </div>
      )}
      {!isLoading && !!notes.length && (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
          {notes.map((n) => {
            const k = ICONS[n.kind];
            return (
              <li key={n.key}>
                <Link to="/chats" search={{ p: n.phone }} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${k.cls}`}><k.icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{n.title}</span>
                      <ChannelBadge phone={n.phone} />
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{preview(n.sub) || "—"}</div>
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{ago(n.at)}</span>
                  <ArrowUpLeft className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
