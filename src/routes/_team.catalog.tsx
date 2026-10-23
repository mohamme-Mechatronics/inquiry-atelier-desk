import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Package, Pencil, Search, Trash2, Plus, FileText, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState, Skeleton } from "@/components/admin";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { catalogFiles } from "@/lib/catalog-files";
import { catalogGroup, catalogBrand } from "@/lib/catalog-groups";

export const Route = createFileRoute("/_team/catalog")({
  head: () => ({ meta: [
    { title: "الأصناف والكتالوجات — تمكين" },
    { name: "description", content: "إدارة أصناف تمكين وأسعارها وكتالوجات المواصفات الفنية PDF." },
    { property: "og:title", content: "الأصناف والكتالوجات — تمكين" },
    { property: "og:description", content: "أصناف تمكين وأسعارها وملفات المواصفات الفنية." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Catalog,
});
const empty = { code: "", name: "", unit: "", price: "", specs: "", pdf: "" };
type Item = { code: string; name: string; price: number | null; unit: string | null; specs: unknown; url?: string };
function specLines(specs: unknown): string[] { return Array.isArray(specs) ? specs.filter((s): s is string => typeof s === "string") : []; }
function safeUrl(url: string) { try { return new URL(url).protocol === "https:" ? url : ""; } catch { return ""; } }
function Catalog() {
  const qc = useQueryClient();
  const [f, setF] = useState(empty);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("prices");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data = [], isLoading, error } = useQuery({ queryKey: ["catalog"], queryFn: async () => {
    const result = await supabase.from("catalog_items").select("*").order("code");
    if (result.error) throw result.error;
    return result.data ?? [];
  } });
  const pdfItems: Item[] = catalogFiles.map((file) => {
    const row = data.find((r) => r.code === file.code);
    const override = specLines(row?.specs).find((s) => s.startsWith("PDF_URL="))?.slice(8);
    return { code: file.code, name: row?.name ?? file.name, url: safeUrl(override ?? file.url), price: row?.price ?? null, unit: row?.unit ?? null, specs: row?.specs ?? [] };
  });
  for (const row of data) {
    if (pdfItems.some((r) => r.code === row.code)) continue;
    const url = specLines(row.specs).find((s) => s.startsWith("PDF_URL="))?.slice(8);
    if (url && safeUrl(url)) pdfItems.push({ ...row, url });
  }
  const list: Item[] = (tab === "pdf" ? pdfItems : data).filter((r) => `${r.code} ${r.name}`.toLowerCase().includes(q.trim().toLowerCase()));
  const groups = Array.from(new Set(list.map((r) => catalogGroup(r.code, r.name))));
  const edit = (r: Item) => {
    setF({ code: r.code, name: r.name, unit: r.unit ?? "", price: r.price == null ? "" : String(r.price), specs: specLines(r.specs).filter((s) => !s.startsWith("PDF_URL=")).join("\n"), pdf: r.url ?? specLines(r.specs).find((s) => s.startsWith("PDF_URL="))?.slice(8) ?? "" });
    setOpen(true);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.pdf && !safeUrl(f.pdf)) { toast.error("أدخل رابط PDF آمن يبدأ بـ https://"); return; }
    setSaving(true);
    try {
      const specs = f.specs.split("\n").map((s) => s.trim()).filter(Boolean);
      if (f.pdf) specs.push(`PDF_URL=${f.pdf}`);
      const { error } = await supabase.from("catalog_items").upsert({ code: f.code.trim(), name: f.name.trim(), unit: f.unit || null, price: f.price === "" ? null : Number(f.price), specs, updated_at: new Date().toISOString() });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["catalog"] });
      setOpen(false); toast.success("تم حفظ الصنف");
    } catch { toast.error("تعذر الحفظ"); } finally { setSaving(false); }
  };
  const del = async (code: string) => {
    if (!confirm(`حذف الصنف ${code}؟`)) return;
    const { error } = await supabase.from("catalog_items").delete().eq("code", code);
    if (error) { toast.error("تعذر الحذف"); return; }
    await qc.invalidateQueries({ queryKey: ["catalog"] }); toast.success("تم الحذف");
  };
  const renderItems = (rows: Item[]) => <ul className="divide-y">{rows.map((r) => <li key={r.code} className="px-3 py-3 md:px-4">
    <p className="break-words text-sm font-semibold leading-6">{r.name}</p>
    <div className="mt-2 flex items-center justify-between gap-2">
      {tab === "prices" ? <span className="text-xs text-muted-foreground"><b className="text-sm tabular-nums text-foreground" dir="ltr">{r.price == null ? "—" : `$${r.price.toLocaleString("en-US")}`}</b>{r.unit && ` / ${r.unit}`}</span>
        : r.url ? <Button asChild variant="ghost" size="sm" className="h-8 gap-1 px-2 text-primary"><a href={r.url} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4" />فتح<ExternalLink className="h-3 w-3" /></a></Button> : <span className="text-xs text-muted-foreground">الملف غير متاح</span>}
      <div className="flex gap-1">
        <Button variant="outline" size="sm" className="h-8 gap-1 px-2" onClick={() => edit(r)} aria-label={`تعديل ${r.name}`}><Pencil className="h-3.5 w-3.5" />تعديل</Button>
        {tab === "prices" && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={`حذف ${r.name}`} onClick={() => del(r.code)}><Trash2 className="h-3.5 w-3.5" /></Button>}
      </div>
    </div>
  </li>)}</ul>;
  return <div className="mx-auto max-w-4xl space-y-2">
    <Tabs value={tab} onValueChange={setTab} dir="rtl"><TabsList className="grid h-9 w-full grid-cols-2 rounded-md"><TabsTrigger value="prices" className="gap-1.5 rounded text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Package className="h-3.5 w-3.5" />الأصناف والأسعار</TabsTrigger><TabsTrigger value="pdf" className="gap-1.5 rounded text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><FileText className="h-3.5 w-3.5" />الكتالوجات PDF</TabsTrigger></TabsList></Tabs>
    <div className="flex gap-2"><div className="relative min-w-0 flex-1"><Search className="absolute start-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input className="h-9 rounded-md bg-card ps-8 text-xs" aria-label="بحث عن صنف" placeholder="بحث عن صنف…" value={q} onChange={(e) => setQ(e.target.value)} /></div><Button size="icon" className="h-9 w-9 shrink-0 rounded-md" aria-label="إضافة صنف" title="إضافة صنف" onClick={() => { setF(empty); setOpen(true); }}><Plus className="h-4 w-4" /></Button></div>
    {isLoading ? <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16" />)}</div> : error ? <EmptyState icon={Package} title="تعذر تحميل الأصناف" /> : list.length === 0 ? <EmptyState icon={tab === "pdf" ? FileText : Package} title={q ? "لا توجد نتائج" : "لا توجد أصناف مسجلة"} /> :
    <Accordion type="multiple" className="space-y-1.5" key={`${tab}-${q}`} defaultValue={q ? groups : []}>{groups.map((group) => {
      const rows = list.filter((r) => catalogGroup(r.code, r.name) === group);
      const brands = Array.from(new Set(rows.map((r) => catalogBrand(r.name))));
      const nested = (group === "الإنفرترات" || group === "البطاريات") && brands.length > 1;
      return <AccordionItem key={group} value={group} className="overflow-hidden rounded-md border bg-card"><AccordionTrigger className="min-h-10 flex-row-reverse gap-2 px-2.5 py-2 text-start text-xs font-semibold text-primary hover:no-underline [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:rotate-90 [&[data-state=open]>svg]:rotate-0"><span className="min-w-0 flex-1 break-words">{group}</span><span className="min-w-5 rounded bg-muted px-1.5 py-0.5 text-center text-[10px] tabular-nums text-muted-foreground">{rows.length}</span></AccordionTrigger><AccordionContent className="border-t pb-0">{nested ? <Accordion type="multiple" defaultValue={q ? brands : []}>{brands.map((brand) => <AccordionItem key={brand} value={brand}><AccordionTrigger className="gap-2 bg-muted/40 px-3 py-2 text-start text-xs hover:no-underline"><span className="flex-1">{brand}</span><span className="text-[10px] text-muted-foreground">{rows.filter((r) => catalogBrand(r.name) === brand).length}</span></AccordionTrigger><AccordionContent className="pb-0">{renderItems(rows.filter((r) => catalogBrand(r.name) === brand))}</AccordionContent></AccordionItem>)}</Accordion> : renderItems(rows)}</AccordionContent></AccordionItem>;
    })}</Accordion>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent dir="rtl" className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg p-4"><DialogTitle className="pe-6 text-start">{f.code ? "تعديل الصنف" : "إضافة صنف"}</DialogTitle><DialogDescription className="sr-only">بيانات الصنف وملف المواصفات</DialogDescription><form onSubmit={save} className="space-y-3">
      <div className="space-y-1"><Label htmlFor="item-code">الرمز</Label><Input id="item-code" required dir="ltr" readOnly={data.some((r) => r.code === f.code)} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></div>
      <div className="space-y-1"><Label htmlFor="item-name">الاسم</Label><Input id="item-name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label htmlFor="item-price">السعر بالدولار</Label><Input id="item-price" type="number" step="any" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div><div className="space-y-1"><Label htmlFor="item-unit">الوحدة</Label><Input id="item-unit" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></div></div>
      <div className="space-y-1"><Label htmlFor="item-pdf">رابط كتالوج PDF</Label><Input id="item-pdf" type="url" dir="ltr" value={f.pdf} onChange={(e) => setF({ ...f, pdf: e.target.value })} /></div>
      <div className="space-y-1"><Label htmlFor="item-specs">المواصفات</Label><Textarea id="item-specs" rows={3} value={f.specs} onChange={(e) => setF({ ...f, specs: e.target.value })} /></div>
      <div className="flex gap-2"><Button className="flex-1" disabled={saving}>{saving ? "جارٍ الحفظ…" : "حفظ"}</Button><Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button></div>
    </form></DialogContent></Dialog>
  </div>;
}
