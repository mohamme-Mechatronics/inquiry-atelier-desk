import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, MapPin, Sun, Calendar, MessageCircle, ShoppingCart, Bot, Headset } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Avatar, ChannelBadge, EmptyState, MessageBubble, Panel, Skeleton } from "@/components/admin";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUSES, STAGES, channelOf, fmt } from "@/lib/crm";

export const Route = createFileRoute("/_team/customers_/$phone")({
  head: () => ({
    meta: [
      { title: "ملف العميل — تمكين" },
      { name: "description", content: "محادثة العميل وحالته وطلباته" },
      { property: "og:title", content: "ملف العميل — تمكين" },
      { property: "og:description", content: "محادثة العميل وحالته وطلباته" },
    ],
  }),
  component: Customer,
});

function Customer() {
  const { phone } = Route.useParams();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["customer", phone],
    queryFn: async () => {
      const [c, m, o] = await Promise.all([
        supabase.from("customers").select("*").eq("phone", phone).maybeSingle(),
        supabase.from("messages").select("*").eq("phone", phone).order("created_at").limit(500),
        supabase.from("orders").select("*").eq("phone", phone).order("created_at", { ascending: false }),
      ]);
      return { c: c.data, msgs: m.data ?? [], orders: o.data ?? [] };
    },
    refetchInterval: 15000,
  });
  const update = async (patch: { status?: string; bot_paused?: boolean }) => {
    const { error } = await supabase.from("customers").update(patch).eq("phone", phone);
    if (error) { toast.error("تعذر الحفظ"); return; }
    toast.success("تم الحفظ");
    qc.invalidateQueries({ queryKey: ["customer", phone] });
    qc.invalidateQueries({ queryKey: ["customers"] });
  };
  const c = data?.c;
  if (!data) return <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-80" /><Skeleton className="h-80 lg:col-span-2" /></div>;
  if (!c) return <EmptyState icon={MessageCircle} title="العميل غير موجود" hint="ربما حُذف أو تغيّر رقمه." />;
  const wa = channelOf(c.phone) === "whatsapp";
  const info = [
    { icon: MapPin, label: "المدينة", v: c.city },
    { icon: Sun, label: "المنظومة", v: c.system },
    { icon: Calendar, label: "تاريخ التسجيل", v: fmt(c.created_at) },
    { icon: MessageCircle, label: "المرحلة", v: c.stage ? STAGES[c.stage] ?? c.stage : null },
  ];

  return (
    <div className="space-y-4">
      <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="h-4 w-4" /> العملاء
      </Link>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Panel bodyClass="space-y-5 p-0">
            <div className={`flex items-center gap-3 px-4 py-4 text-primary-foreground ${wa ? "bg-wa-head" : "bg-tg-head"}`}>
              <Avatar name={c.name} phone={c.phone} size="lg" />
              <div className="min-w-0">
                <h1 className="truncate text-lg font-extrabold">{c.name || "بدون اسم"}</h1>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-primary-foreground/80">
                  <span>{wa ? "واتساب" : "تليجرام"}</span><span>•</span>
                  {wa ? (
                    <a dir="ltr" href={`https://wa.me/${c.phone}`} target="_blank" rel="noreferrer" className="tabular-nums hover:underline">+{c.phone}</a>
                  ) : <span dir="ltr" className="tabular-nums">{c.phone}</span>}
                </div>
              </div>
            </div>
            <div className="space-y-5 px-4 pb-4">
            <dl className="grid grid-cols-2 gap-2">
              {info.map((x) => (
                <div key={x.label} className="rounded-lg bg-muted/60 p-2.5">
                  <dt className="flex items-center gap-1 text-[11px] text-muted-foreground"><x.icon className="h-3 w-3" /> {x.label}</dt>
                  <dd className="mt-0.5 truncate text-sm font-semibold">{x.v || "—"}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">حالة العميل</p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(STATUSES).map(([k, s]) => (
                  <button key={k} onClick={() => update({ status: k })}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${c.status === k ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">من يرد على العميل</p>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 text-sm font-semibold">
                <button onClick={() => update({ bot_paused: false })}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${!c.bot_paused ? "bg-card text-foreground shadow-card" : "text-muted-foreground"}`}>
                  <Bot className="h-4 w-4" /> البوت
                </button>
                <button onClick={() => update({ bot_paused: true })}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${c.bot_paused ? "bg-accent text-accent-foreground shadow-card" : "text-muted-foreground"}`}>
                  <Headset className="h-4 w-4" /> الموظف
                </button>
              </div>
            </div>
            <Link to="/chats" search={{ p: c.phone }} className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 ${wa ? "bg-wa-head" : "bg-tg-head"}`}>
              <MessageCircle className="h-4 w-4" /> الرد على العميل
            </Link>
            </div>
          </Panel>

          <Panel title={`الطلبات (${data.orders.length})`} icon={ShoppingCart}>
            {data.orders.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">لا توجد طلبات</p>}
            <ul className="divide-y">
              {data.orders.map((o) => (
                <li key={o.id} className="space-y-1 p-4 text-sm">
                  <div className="flex items-center justify-between"><b className="tabular-nums">{o.amount || "—"}</b><StatusBadge status={o.status} /></div>
                  <p className="text-xs text-muted-foreground">الفاتورة {o.invoice_no || "—"} · {o.method || "—"} · {fmt(o.created_at)}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel title="سجل المحادثة" icon={MessageCircle} className="lg:col-span-2"
          action={<span className="text-xs tabular-nums text-muted-foreground">{data.msgs.length} رسالة</span>}>
          <div className={`max-h-[75vh] min-h-64 space-y-1.5 overflow-y-auto p-3 ${wa ? "chat-wa" : "chat-tg"}`}>
            {data.msgs.length === 0 && <EmptyState icon={MessageCircle} title="لا توجد رسائل" />}
            {data.msgs.map((m) => <MessageBubble key={m.id} m={m} skin={wa ? "whatsapp" : "telegram"} />)}
          </div>
        </Panel>
      </div>
    </div>
  );
}
