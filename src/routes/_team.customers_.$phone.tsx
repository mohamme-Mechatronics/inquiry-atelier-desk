import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { STATUSES, fmt } from "@/lib/crm";

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
    if (error) return toast.error("تعذر الحفظ");
    toast.success("تم الحفظ");
    qc.invalidateQueries({ queryKey: ["customer", phone] });
    qc.invalidateQueries({ queryKey: ["customers"] });
  };
  const c = data?.c;
  if (!data) return <p className="text-muted-foreground">جارٍ التحميل…</p>;
  if (!c) return <p>العميل غير موجود. <Link to="/customers" className="underline">رجوع</Link></p>;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4">
        <div className="space-y-3 rounded-xl bg-card p-4 shadow-sm">
          <h1 className="text-xl font-extrabold">{c.name || "بدون اسم"}</h1>
          <a dir="ltr" href={`https://wa.me/${c.phone}`} target="_blank" rel="noreferrer" className="block text-sm text-primary underline">+{c.phone}</a>
          <p className="text-sm">المدينة: {c.city || "—"}</p>
          <p className="text-sm">المنظومة: {c.system || "—"}</p>
          <div>
            <p className="mb-1 text-sm font-semibold">حالة الطلب</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(STATUSES).map(([k, s]) => (
                <button key={k} onClick={() => update({ status: k })} className={`rounded-full px-3 py-1 text-xs ${c.status === k ? s.cls + " ring-2 ring-ring" : "bg-muted"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between rounded-lg bg-muted p-2 text-sm">
            إيقاف البوت لهذا العميل (رد يدوي)
            <Switch checked={c.bot_paused} onCheckedChange={(v) => update({ bot_paused: v })} />
          </label>
        </div>
        {data.orders.map((o) => (
          <div key={o.id} className="rounded-xl border-s-4 border-accent bg-card p-3 text-sm shadow-sm">
            <b>طلب شراء</b> · {fmt(o.created_at)}
            <p>الفاتورة: {o.invoice_no || "—"} · المبلغ: {o.amount || "—"} · الدفع: {o.method || "—"}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-card p-3 shadow-sm lg:col-span-2">
        <h2 className="mb-2 font-bold">المحادثة</h2>
        <div className="max-h-[70vh] space-y-2 overflow-y-auto">
          {data.msgs.map((m) => (
            <div key={m.id} className={`max-w-[85%] whitespace-pre-wrap rounded-xl p-2 text-sm ${m.direction === "customer" ? "me-auto bg-muted" : "ms-auto bg-secondary"}`}>
              {m.kind === "document" && <b className="block">📄 {m.file_name}</b>}
              {m.text}
              <div className="mt-1 text-[10px] text-muted-foreground">{m.direction === "customer" ? "العميل" : "البوت"} · {fmt(m.created_at)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
