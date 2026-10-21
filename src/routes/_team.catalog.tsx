import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  const { data = [] } = useQuery({
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
    if (error) return toast.error("تعذر الحفظ");
    toast.success("تم حفظ الصنف");
    setF(empty);
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };
  const del = async (code: string) => {
    await supabase.from("catalog_items").delete().eq("code", code);
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">الأصناف والأسعار</h1>
      <p className="text-sm text-muted-foreground">
        البوت يقرأ الأسعار من هنا. إذا لم يكن الصنف موجوداً يستخدم البوت سعره المكتوب داخله. الرمز يجب أن يطابق رمز البوت (مثل PV_SUNTECH_595 أو INV_DEYE_12K_1P).
      </p>
      <form onSubmit={save} className="grid gap-2 rounded-xl bg-card p-4 shadow-sm md:grid-cols-4">
        <Input required dir="ltr" placeholder="الرمز" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
        <Input required placeholder="الاسم" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input placeholder="الوحدة" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} />
        <Input type="number" step="any" placeholder="السعر" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        <Textarea className="md:col-span-3" placeholder="المواصفات (كل سطر مواصفة)" value={f.specs} onChange={(e) => setF({ ...f, specs: e.target.value })} />
        <Button>حفظ الصنف</Button>
      </form>
      <div className="divide-y rounded-xl bg-card shadow-sm">
        {data.map((r) => (
          <div key={r.code} className="flex items-center gap-3 p-3 text-sm">
            <code dir="ltr" className="text-xs">{r.code}</code>
            <span className="flex-1 font-semibold">{r.name}</span>
            <span>{r.price ?? "—"} {r.unit}</span>
            <Button size="sm" variant="outline" onClick={() => setF({ code: r.code, name: r.name, unit: r.unit ?? "", price: r.price == null ? "" : String(r.price), specs: ((r.specs as string[]) ?? []).join("\n") })}>تعديل</Button>
            <Button size="sm" variant="ghost" onClick={() => del(r.code)}>حذف</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
