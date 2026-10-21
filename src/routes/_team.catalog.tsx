import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Package, Pencil, Search, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState, PageHeader, Panel, Skeleton } from "@/components/admin";

export const Route = createFileRoute("/_team/catalog")({
  head: () => ({
    meta: [
      { title: "الأصناف والأسعار — تمكين" },
      { name: "description", content: "أسعار ومواصفات الأصناف التي يستخدمها البوت في عروض الأسعار" },
      { property: "og:title", content: "الأصناف والأسعار — تمكين" },
      { property: "og:description", content: "أسعار ومواصفات الأصناف التي يستخدمها البوت" },
    ],
  }),
  component: Catalog,
});

const empty = { code: "", name: "", unit: "", price: "", specs: "" };

function Catalog() {
  const qc = useQueryClient();
  const [f, setF] = useState(empty);
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => (await supabase.from("catalog_items").select("*").order("code")).data ?? [],
  });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("catalog_items").upsert({
      code: f.code.trim(),
      name: f.name.trim(),
      unit: f.unit || null,
      price: f.price === "" ? null : Number(f.price),
      specs: f.specs.split("\n").map((s) => s.trim()).filter(Boolean),
      updated_at: new Date().toISOString(),
    });
    if (error) { toast.error("تعذر الحفظ"); return; }
    toast.success("تم حفظ الصنف");
    setF(empty);
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };
  const del = async (code: string) => {
    if (!confirm(`حذف الصنف ${code}؟`)) return;
    await supabase.from("catalog_items").delete().eq("code", code);
    toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };
  const list = data.filter((r) => !q || `${r.code} ${r.name}`.toLowerCase().includes(q.toLowerCase()));
  const editing = data.some((r) => r.code === f.code);

  return (
    <div className="space-y-4">
      <PageHeader title="الأصناف والأسعار" count={data.length}
        description="البوت يقرأ الأسعار من هنا، وإذا لم يجد الصنف يستخدم سعره الداخلي. الرمز يطابق رمز البوت مثل PV_SUNTECH_595." />

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <Panel title={editing ? "تعديل صنف" : "إضافة صنف"} icon={editing ? Pencil : Plus} className="self-start">
          <form onSubmit={save} className="space-y-3 p-4">
            <div className="space-y-1.5"><Label>الرمز</Label><Input required dir="ltr" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="INV_DEYE_12K_1P" /></div>
            <div className="space-y-1.5"><Label>الاسم</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label>السعر</Label><Input type="number" step="any" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>الوحدة</Label><Input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="$" /></div>
            </div>
            <div className="space-y-1.5"><Label>المواصفات</Label><Textarea rows={4} placeholder="كل سطر مواصفة" value={f.specs} onChange={(e) => setF({ ...f, specs: e.target.value })} /></div>
            <div className="flex gap-2">
              <Button className="flex-1">{editing ? "حفظ التعديل" : "إضافة الصنف"}</Button>
              {(f.code || f.name) && <Button type="button" variant="ghost" onClick={() => setF(empty)}>إلغاء</Button>}
            </div>
          </form>
        </Panel>

        <Panel>
          <div className="border-b p-3">
            <div className="relative sm:w-72">
              <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input placeholder="بحث بالرمز أو الاسم" value={q} onChange={(e) => setQ(e.target.value)}
                className="h-9 w-full rounded-lg border bg-background pe-3 ps-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </div>
          <div className="hidden grid-cols-[12rem_1fr_7rem_5rem] gap-3 border-b bg-muted/50 px-4 py-2 text-[11px] font-semibold text-muted-foreground md:grid">
            <span>الرمز</span><span>الاسم</span><span className="text-end">السعر</span><span />
          </div>
          {isLoading && <div className="space-y-3 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>}
          {!isLoading && list.length === 0 && <EmptyState icon={Package} title="لا توجد أصناف" hint="أضف صنفاً من النموذج ليستخدم البوت سعره." />}
          <ul className="divide-y">
            {list.map((r) => (
              <li key={r.code} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm md:grid md:grid-cols-[12rem_1fr_7rem_5rem]">
                <code dir="ltr" className="truncate rounded bg-muted px-1.5 py-0.5 text-start text-[11px]">{r.code}</code>
                <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
                <span className="font-bold tabular-nums md:text-end">{r.price ?? "—"} <span className="text-xs font-normal text-muted-foreground">{r.unit}</span></span>
                <div className="flex justify-end gap-0.5">
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="تعديل"
                    onClick={() => setF({ code: r.code, name: r.name, unit: r.unit ?? "", price: r.price == null ? "" : String(r.price), specs: ((r.specs as string[]) ?? []).join("\n") })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="حذف" onClick={() => del(r.code)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
