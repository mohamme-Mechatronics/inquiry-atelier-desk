import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FilePlus2, Search, Plus, Minus, Trash2, FileText, Download, Send, RotateCcw, Printer, History, Battery, Zap, Sun, Shield, Cable, Server, Wrench, Home, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EmptyState, selectCls } from "@/components/admin";
import { catalogGroup } from "@/lib/catalog-groups";
import { quoteMoney, quoteTotal, type QuoteLine } from "@/lib/manual-quote";
import { generateManualQuote } from "@/lib/manual-quote.functions";
import { productSpecs, quoteCategory, quoteCategories, readyQuotes } from "@/lib/quote-catalog";
import { Link } from "@tanstack/react-router";
import { sendFile } from "@/lib/reply.functions";

const builderQuery = queryOptions({ queryKey: ["quote-builder-data"], queryFn: async () => {
  const [items, customers] = await Promise.all([
    supabase.from("catalog_items").select("code,name,unit,price,specs").order("code"),
    supabase.from("customers").select("phone,name,city").order("last_at", { ascending: false }),
  ]);
  if (items.error || customers.error) throw new Error("تعذر تحميل الأصناف والعملاء");
  return { items: items.data ?? [], customers: customers.data ?? [] };
} });
export const Route = createFileRoute("/_team/quote-builder")({
  head: () => ({ meta: [
    { title: "إنشاء عرض سعر — تمكين" }, { name: "description", content: "إنشاء عروض أسعار تمكين من الأصناف الحالية وإرسالها للعملاء." },
    { property: "og:title", content: "إنشاء عرض سعر — تمكين" }, { property: "og:description", content: "اختيار الأصناف والكميات وإصدار عرض سعر رسمي." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(builderQuery), component: QuoteBuilder,
});

function QuoteBuilder() {
  const { data: { items, customers } } = useSuspenseQuery(builderQuery);
  const qc = useQueryClient();
  const generate = useServerFn(generateManualQuote);
  const deliver = useServerFn(sendFile);
  const [currency, setCurrency] = useState<"USD" | "YER">("USD");
  const [rate, setRate] = useState("");
  const [readyOpen, setReadyOpen] = useState(false);
  const [group, setGroup] = useState("الإنفرترات");
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState<"سكني" | "تجاري">("سكني");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(false);
  const [result, setResult] = useState<{ url: string; path: string; invoice: string; total: number; currency: "USD" | "YER"; exchangeRate: number; name: string; html: string } | null>(null);
  const lines: QuoteLine[] = items.filter((item) => selected[item.code] != null && item.price != null).map((item) => ({ ...item, price: item.price ?? 0, quantity: selected[item.code] ?? 1, specs: productSpecs(item.code, item.specs) }));
  const total = quoteTotal(lines);
  const groups = quoteCategories.filter((value) => items.some((item) => quoteCategory(catalogGroup(item.code, item.name)) === value));
  const formatMoney = (value: number) => quoteMoney(value, currency, Number(rate) || 1);
  const icons = [Zap, Battery, Sun, Package, Shield, Server, Home, Cable, Wrench, Package];
  const rows = items.filter((item) => quoteCategory(catalogGroup(item.code, item.name)) === group && `${item.name} ${item.code}`.toLowerCase().includes(search.trim().toLowerCase()));
  const change = () => setResult(null);
  const quantity = (code: string, n: number) => { change(); setSelected((old) => ({ ...old, [code]: n })); };
  const remove = (code: string) => { change(); setSelected((old) => { const next = { ...old }; delete next[code]; return next; }); };
  const make = async () => {
    if (currency === "YER" && !(Number(rate) > 0)) { toast.error("أدخل سعر الصرف للريال اليمني"); return; }
    if (!phone || !name.trim()) { toast.error("اختر العميل وأدخل اسمه"); return; }
    if (!lines.length) { toast.error("اختر صنفاً واحداً على الأقل"); return; }
    if (lines.some((line) => !Number.isFinite(line.quantity) || line.quantity <= 0)) { toast.error("أدخل كميات أكبر من صفر"); return; }
    setBusy(true);
    try {
      const next = await generate({ data: { id: crypto.randomUUID(), phone, name, city, branch, notes, currency, exchangeRate: currency === "USD" ? 1 : Number(rate), lines: lines.map(({ code, quantity }) => ({ code, quantity })) } });
      setResult(next); setPreview(true);
      await qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("تم إنشاء العرض وحفظه في الطلبات");
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر إنشاء العرض"); }
    finally { setBusy(false); }
  };
  const download = async () => {
    if (!result) return;
    try {
      const response = await fetch(result.url);
      if (!response.ok) throw new Error();
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = result.name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch { toast.error("تعذر تحميل الملف"); }
  };
  const share = async () => {
    if (!result) return;
    if (!confirm(`إرسال عرض السعر ${result.invoice} إلى ${name}؟`)) return;
    setSending(true);
    try { await deliver({ data: { phone, path: result.path, name: result.name, mime: "application/pdf", caption: `عرض سعر ${result.invoice} — ${quoteMoney(result.total, result.currency, result.exchangeRate)}` } }); toast.success("تم إرسال العرض للعميل"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر الإرسال"); }
    finally { setSending(false); }
  };
  return <div className="mx-auto max-w-5xl space-y-3">
    <div className="flex items-center justify-between gap-2"><h1 className="flex items-center gap-2 text-sm font-bold"><FilePlus2 className="h-4 w-4 text-primary" />إنشاء عرض سعر</h1><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="عرض جديد" title="عرض جديد" disabled={busy} onClick={() => { if (!confirm("بدء عرض جديد ومسح الاختيارات؟")) return; setSelected({}); setPhone(""); setName(""); setCity(""); setNotes(""); setResult(null); }}><RotateCcw className="h-3.5 w-3.5" /></Button></div>
    <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex gap-1">{(["سكني", "تجاري"] as const).map((value) => <Button key={value} size="sm" variant={branch === value ? "default" : "ghost"} className="h-7 px-3 text-xs" disabled={busy} onClick={() => { setBranch(value); change(); }}>{value}</Button>)}</div><div className="flex gap-1"><select aria-label="عملة العرض" className={`${selectCls} h-7 max-w-36`} value={currency} disabled={busy} onChange={(e) => { setCurrency(e.target.value === "YER" ? "YER" : "USD"); change(); }}><option value="USD">دولار أمريكي</option><option value="YER">ريال يمني</option></select>{currency === "YER" && <Input aria-label="سعر الصرف" type="number" min="0.01" step="any" placeholder="سعر الصرف" className="h-7 w-24 text-xs" value={rate} disabled={busy} onChange={(e) => { setRate(e.target.value); change(); }} />}</div></div>
    <div className="flex justify-end"><Button variant="secondary" className="h-7 gap-1 px-2 text-[11px]" onClick={() => setReadyOpen(true)}><History className="h-3.5 w-3.5" />العروض الجاهزة ({readyQuotes.length})</Button></div>
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-3">
        <div className="grid grid-cols-2 gap-1.5">{groups.map((value) => { const Icon = icons[quoteCategories.indexOf(value)] ?? Package; return <Button key={value} variant={group === value ? "default" : "outline"} className="h-8 min-w-0 justify-between gap-1 rounded-md px-2 text-[10px]" disabled={busy} onClick={() => setGroup(value)}><Icon className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate text-start">{value}</span><span className="shrink-0 opacity-60">{items.filter((item) => quoteCategory(catalogGroup(item.code, item.name)) === value).length}</span></Button>; })}</div>
        <section className="overflow-hidden rounded-md border bg-card"><div className="flex items-center justify-between gap-2 border-b p-2.5"><h2 className="min-w-0 text-xs font-bold">{group}</h2><div className="relative w-32 shrink-0"><Search className="absolute start-2 top-2 h-3 w-3 text-muted-foreground" /><Input className="h-7 ps-7 text-[11px]" aria-label="بحث الأصناف" placeholder="بحث…" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
        <div className="grid grid-cols-[minmax(0,1fr)_5rem_2rem] gap-2 border-b bg-muted/40 px-3 py-2 text-[10px] text-muted-foreground"><span>الصنف</span><span className="text-center">السعر</span><span>اختيار</span></div>
        <div className="max-h-[420px] overflow-y-auto lg:max-h-[560px]">{!rows.length ? <EmptyState icon={Search} title="لا توجد أصناف" /> : rows.map((item) => <label key={item.code} className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_5rem_2rem] items-center gap-2 border-b px-3 py-3 last:border-0 ${selected[item.code] != null ? "bg-secondary/60" : "hover:bg-muted/40"}`}><span className="break-words text-xs font-medium leading-6">{item.name}</span><span className="text-center"><b dir="ltr" className="block break-words text-xs text-primary">{item.price == null ? "—" : formatMoney(item.price)}</b><span className="text-[9px] text-muted-foreground">/ {item.unit || "—"}</span></span><Checkbox aria-label={`اختيار ${item.name}`} disabled={item.price == null || busy} checked={selected[item.code] != null} onCheckedChange={(checked) => checked ? quantity(item.code, 1) : remove(item.code)} /></label>)}</div></section>
      </div>
      <div className="min-w-0 space-y-3 lg:sticky lg:top-20">
        <div className="space-y-2 border-b pb-3"><select aria-label="العميل" id="quote-customer" className={`${selectCls} w-full`} value={phone} disabled={busy} onChange={(e) => { const customer = customers.find((c) => c.phone === e.target.value); setPhone(e.target.value); setName(customer?.name ?? ""); setCity(customer?.city ?? ""); change(); }}><option value="">العميل — اختياري للمعاينة</option>{customers.map((customer) => <option key={customer.phone} value={customer.phone}>{customer.name || customer.phone} — {customer.phone}</option>)}</select><div className="grid grid-cols-3 gap-1.5"><Input aria-label="اسم العميل" placeholder="الاسم" className="h-8 px-2 text-xs" value={name} disabled={busy} onChange={(e) => { setName(e.target.value); change(); }} /><Input aria-label="موقع العميل" placeholder="الموقع" className="h-8 px-2 text-xs" value={city} disabled={busy} onChange={(e) => { setCity(e.target.value); change(); }} /><Input aria-label="رقم العميل" placeholder="الموبايل" dir="ltr" className="h-8 px-2 text-xs" value={phone} readOnly /></div></div>
        <div className="flex items-center justify-between"><h2 className="text-xs font-bold">الأصناف المختارة</h2><span className="rounded bg-primary px-1.5 text-[10px] text-primary-foreground">{lines.length}</span></div>
        {!lines.length ? <div className="flex min-h-16 items-center justify-center rounded-md border border-dashed text-[11px] text-muted-foreground">لا توجد أصناف مختارة</div> : <ul className="divide-y">{lines.map((line) => <li key={line.code} className="space-y-2 py-3"><div className="flex items-start justify-between gap-2"><p className="text-xs font-bold leading-5">{line.name}</p><Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" aria-label={`إزالة ${line.name}`} disabled={busy} onClick={() => remove(line.code)}><Trash2 className="h-3 w-3" /></Button></div>{!!line.specs?.length && <ul className="space-y-1 text-[10px] leading-5 text-muted-foreground">{line.specs.map((spec, i) => <li key={i} className="border-b border-dashed pb-1">{spec}</li>)}</ul>}<div className="flex items-center justify-between gap-2"><div className="flex items-center gap-1"><Button variant="outline" size="icon" className="h-7 w-7" aria-label={`زيادة كمية ${line.name}`} disabled={busy} onClick={() => quantity(line.code, line.quantity + 1)}><Plus className="h-3 w-3" /></Button><Input aria-label={`كمية ${line.name}`} type="number" min="0.01" max="100000" step="any" className="h-7 w-16 px-1 text-center text-xs" value={line.quantity || ""} disabled={busy} onChange={(e) => quantity(line.code, Number(e.target.value))} /><Button variant="outline" size="icon" className="h-7 w-7" aria-label={`تقليل كمية ${line.name}`} disabled={busy || line.quantity <= 1} onClick={() => quantity(line.code, line.quantity - 1)}><Minus className="h-3 w-3" /></Button></div><b dir="ltr" className="text-xs">{formatMoney(Math.round(line.price * line.quantity * 100) / 100)}</b></div></li>)}</ul>}
        <Textarea aria-label="ملاحظات عرض السعر" placeholder="ملاحظات على عرض السعر" rows={2} className="text-xs" value={notes} disabled={busy} onChange={(e) => { setNotes(e.target.value); change(); }} />
        <div className="flex items-center justify-between rounded-md bg-primary px-3 py-2 text-primary-foreground"><span className="text-xs">الإجمالي</span><b dir="ltr" className="text-base tabular-nums">{formatMoney(total)}</b></div>
        <div className="grid grid-cols-2 gap-2"><Button className="h-9 gap-1 px-2 text-[11px]" disabled={busy || !lines.length} onClick={() => result ? setPreview(true) : make()}><FileText className="h-3.5 w-3.5" />{busy ? "جارٍ الإنشاء…" : result ? "عرض PDF" : "إنشاء عرض السعر"}</Button><Button variant="outline" className="h-9 gap-1 px-2 text-[11px]" disabled={!result || sending} onClick={share}><Send className="h-3.5 w-3.5" />{sending ? "جارٍ الإرسال…" : "مشاركة مع العميل"}</Button></div>
        {result && <Button variant="ghost" className="h-8 w-full gap-2 text-xs" onClick={download}><Download className="h-4 w-4" />{result.invoice} — تحميل PDF</Button>}
      </div>
    </div>
    <Dialog open={readyOpen} onOpenChange={setReadyOpen}><DialogContent dir="rtl" className="max-h-[85dvh] overflow-y-auto p-4"><DialogTitle className="text-sm">العروض الجاهزة</DialogTitle><DialogDescription className="sr-only">منظومات البوت الحالية</DialogDescription><div className="divide-y">{readyQuotes.map((quote) => { const complete = quote.lines.every((line) => items.some((item) => item.code === line.code && item.price != null)); return <div key={quote.code} className="space-y-2 py-3"><p className="text-xs font-semibold leading-6">{quote.name}</p><div className="flex items-center justify-between gap-2"><span className="text-[10px] text-muted-foreground">{quote.daily} كيلووات ساعة / يوم</span>{complete ? <Button size="sm" className="h-7 text-xs" onClick={() => { setSelected(Object.fromEntries(quote.lines.map((line) => [line.code, line.quantity]))); setBranch("سكني"); change(); setReadyOpen(false); }}>اختيار</Button> : <span className="text-[10px] text-muted-foreground">تحتاج استكمال الأصناف في الكتالوج</span>}</div></div>; })}</div><Button asChild variant="outline" size="sm"><Link to="/quotes">عروض الأسعار المحفوظة</Link></Button></DialogContent></Dialog>
    <Dialog open={preview} onOpenChange={setPreview}><DialogContent dir="rtl" className="flex h-[90dvh] max-w-4xl flex-col gap-2 p-3"><DialogTitle className="pe-8 text-sm">عرض سعر {result?.invoice}</DialogTitle><DialogDescription className="sr-only">معاينة عرض السعر الرسمي</DialogDescription>{result && <><iframe srcDoc={result.html} sandbox="" title="معاينة عرض السعر PDF" className="min-h-0 w-full flex-1 rounded-md border bg-card" /><div className="flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" onClick={download}><Download className="h-4 w-4" />تحميل PDF</Button><Button size="sm" variant="outline" onClick={() => window.open(result.url, "_blank", "noopener,noreferrer")}><Printer className="h-4 w-4" />فتح للطباعة</Button><Button size="sm" disabled={sending} onClick={share}><Send className="h-4 w-4" />إرسال</Button></div></>}</DialogContent></Dialog>
  </div>;
}