import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FilePlus2, Search, Plus, Minus, Trash2, Download, Share2, RotateCcw, Printer, History, BatteryMedium, Zap, Sun, ShieldCheck, Cable, Server, Wrench, Home, Box, Cpu, Package, Check, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { selectCls } from "@/components/admin";
import { catalogGroup } from "@/lib/catalog-groups";
import { quoteMoney, quoteTotal, type QuoteLine } from "@/lib/manual-quote";
import { generateManualQuote } from "@/lib/manual-quote.functions";
import { productSpecs, quoteCategory, quoteCategories, readyQuotes, commercialQuotes, pickResidential, pickCommercial, commercialMonthlyKwh, type ReadyLine, type CommercialMethod } from "@/lib/quote-catalog";
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

const CUSTOM = "أصناف مخصصة وخدمات";
const icons: Record<string, typeof Zap> = { "الإنفرترات": Zap, "البطاريات": BatteryMedium, "الألواح": Sun, "صناديق حماية DC": Box, "لوحات حماية AC": ShieldCheck, "راكات وكبائن التخزين": Server, "استندات المنظومات": Home, "كنترولات وحماية البطاريات": Cpu, "الكابلات والتوصيلات": Cable, "أصناف أخرى": Package, [CUSTOM]: Wrench };
const label = (g: string) => g === "الألواح" ? "الألواح الشمسية" : g === "الكابلات والتوصيلات" ? "الكنشات والكابلات" : g;
type Custom = { name: string; unit: string; price: number; specs: string[] };
const groupBy = <T,>(rows: T[], key: (r: T) => string) => rows.reduce<[string, T[]][]>((acc, r) => { const k = key(r); const hit = acc.find((a) => a[0] === k); if (hit) hit[1].push(r); else acc.push([k, [r]]); return acc; }, []);

function QuoteBuilder() {
  const { data: { items, customers } } = useSuspenseQuery(builderQuery);
  const qc = useQueryClient();
  const generate = useServerFn(generateManualQuote);
  const deliver = useServerFn(sendFile);
  const [currency, setCurrency] = useState<"USD" | "YER">("USD");
  const [rate, setRate] = useState("");
  const [branch, setBranch] = useState<"سكني" | "تجاري" | null>(null);
  const [method, setMethod] = useState<CommercialMethod | null>(null);
  const [calcValue, setCalcValue] = useState("");
  const [calc, setCalc] = useState<{ note: string; codes: string[] } | null>(null);
  const [readyOpen, setReadyOpen] = useState(false);
  const [readyTab, setReadyTab] = useState<"سكني" | "تجاري">("سكني");
  const [group, setGroup] = useState("الإنفرترات");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [customs, setCustoms] = useState<Record<string, Custom>>({});
  const [draft, setDraft] = useState({ name: "", price: "", unit: "حبه" });
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(false);
  const [result, setResult] = useState<{ url: string; path: string; invoice: string; total: number; currency: "USD" | "YER"; exchangeRate: number; name: string; html: string } | null>(null);

  const catOf = (item: { code: string; name: string }) => quoteCategory(catalogGroup(item.code, item.name), item.code);
  const lines: QuoteLine[] = [
    ...items.filter((item) => selected[item.code] != null && item.price != null).map((item) => ({ ...item, price: item.price ?? 0, quantity: selected[item.code] ?? 1, specs: productSpecs(item.code, item.specs) })),
    ...Object.entries(customs).filter(([code]) => selected[code] != null).map(([code, c]) => ({ code, name: c.name, unit: c.unit, price: c.price, quantity: selected[code] ?? 1, specs: c.specs })),
  ];
  const total = quoteTotal(lines);
  const groups = [...quoteCategories.filter((value) => items.some((item) => catOf(item) === value)), CUSTOM];
  const countIn = (g: string) => g === CUSTOM ? Object.keys(customs).filter((c) => selected[c] != null).length : items.filter((i) => catOf(i) === g && selected[i.code] != null).length;
  const formatMoney = (value: number) => quoteMoney(value, currency, Number(rate) || 1);
  const rows = items.filter((item) => catOf(item) === group && `${item.name} ${item.code}`.toLowerCase().includes(search.trim().toLowerCase()));
  const change = () => setResult(null);
  const quantity = (code: string, n: number) => { change(); setSelected((old) => ({ ...old, [code]: n })); };
  const remove = (code: string) => { change(); setSelected((old) => { const next = { ...old }; delete next[code]; return next; }); };

  const loadReady = (key: string, quoteLines: ReadyLine[], b: "سكني" | "تجاري") => {
    const nextSel: Record<string, number> = {}; const nextCustom: Record<string, Custom> = {};
    quoteLines.forEach((l, i) => {
      if (l.code && items.some((it) => it.code === l.code && it.price != null)) nextSel[l.code] = (nextSel[l.code] ?? 0) + l.quantity;
      else { const k = `custom:${key}:${i}`; nextCustom[k] = { name: l.name, unit: l.unit, price: l.price, specs: l.specs }; nextSel[k] = l.quantity; }
    });
    setSelected(nextSel); setCustoms(nextCustom); setBranch(b); change(); setReadyOpen(false);
    toast.success("تم تحميل المنظومة في الأصناف المختارة");
  };
  const runCalc = () => {
    const v = Number(calcValue.replace(/,/g, ""));
    if (!(v > 0)) { toast.error("أدخل رقماً صحيحاً"); return; }
    if (branch === "سكني") {
      const pick = pickResidential(v);
      if (pick === "commercial") { setCalc({ note: `الاستهلاك ${Math.round(v / 250 / 30 * 10) / 10} كيلووات/يوم أعلى من أكبر منظومة سكنية — استخدم التجاري`, codes: [] }); return; }
      setCalc({ note: `الاحتياج التقريبي ${Math.round(v / 250 / 30 * 10) / 10} كيلووات/يوم`, codes: (pick ?? []).map((r) => r.code) });
    } else if (method) {
      const q = pickCommercial(method, v); const daily = Math.round(commercialMonthlyKwh(method, v) / 30 * 10) / 10;
      setCalc({ note: q ? `الاحتياج التقريبي ${daily} كيلووات/يوم` : `الاحتياج ${daily} كيلووات/يوم أكبر من المنظومات الجاهزة — يلزم عرض خاص`, codes: q ? [q.code] : [] });
    }
  };
  const addCustom = () => {
    const price = Number(draft.price);
    if (!draft.name.trim() || !(price >= 0) || draft.price === "") { toast.error("أدخل اسم الصنف وسعره"); return; }
    const k = `custom:m:${crypto.randomUUID().slice(0, 8)}`;
    setCustoms((o) => ({ ...o, [k]: { name: draft.name.trim(), unit: draft.unit.trim() || "حبه", price, specs: [] } })); quantity(k, 1); setDraft({ name: "", price: "", unit: "حبه" });
  };
  const make = async () => {
    if (currency === "YER" && !(Number(rate) > 0)) { toast.error("أدخل سعر الصرف للريال اليمني"); return; }
    if (!phone || !name.trim()) { toast.error("اختر العميل وأدخل اسمه"); return; }
    if (!lines.length) { toast.error("اختر صنفاً واحداً على الأقل"); return; }
    if (lines.some((line) => !Number.isFinite(line.quantity) || line.quantity <= 0)) { toast.error("أدخل كميات أكبر من صفر"); return; }
    setBusy(true);
    try {
      const next = await generate({ data: { id: crypto.randomUUID(), phone, name, city, branch: branch ?? "سكني", notes, currency, exchangeRate: currency === "USD" ? 1 : Number(rate), lines: lines.map(({ code, quantity }) => ({ code, quantity, custom: customs[code] })) } });
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
    if (!result) { toast.error("أنشئ عرض السعر أولاً"); return; }
    if (!confirm(`إرسال عرض السعر ${result.invoice} إلى ${name}؟`)) return;
    setSending(true);
    try { await deliver({ data: { phone, path: result.path, name: result.name, mime: "application/pdf", caption: `عرض سعر ${result.invoice} — ${quoteMoney(result.total, result.currency, result.exchangeRate)}` } }); toast.success("تم إرسال العرض للعميل"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر الإرسال"); }
    finally { setSending(false); }
  };

  const pill = (active: boolean) => `h-9 rounded-full px-4 text-[15px] font-bold transition ${active ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-foreground hover:bg-muted/70"}`;
  const readyCard = (key: string, text: string, onClick: () => void, highlight = false) => <button key={key} type="button" onClick={onClick} className={`w-full rounded-xl border bg-card px-3 py-2.5 text-start text-[14px] font-bold leading-6 shadow-sm transition hover:border-primary ${highlight ? "border-primary ring-2 ring-primary/30" : ""}`}>{text}</button>;
  const resList = calc ? readyQuotes.filter((r) => calc.codes.includes(r.code)) : [];
  const comList = calc ? commercialQuotes.filter((r) => calc.codes.includes(r.code)) : [];

  return <div className="quote-builder mx-auto max-w-5xl font-[IBM_Plex_Sans_Arabic]">
    <section className="space-y-3 rounded-2xl border bg-background p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-[22px] font-bold"><FilePlus2 className="h-6 w-6 text-primary" />إنشاء عرض سعر</h1>
        <div className="flex items-center gap-1.5">
          {(["سكني", "تجاري"] as const).map((v) => <button key={v} type="button" className={pill(branch === v)} disabled={busy} onClick={() => { setBranch(v); setMethod(v === "تجاري" ? null : null); setCalc(null); setCalcValue(""); change(); }}>{v}</button>)}
          {branch === "تجاري" && ([["bill", "فاتورة"], ["kwh", "استهلاك شهري"], ["diesel", "الديزل"]] as const).map(([k, t]) => <button key={k} type="button" onClick={() => { setMethod(k); setCalc(null); setCalcValue(""); }} className={`h-9 rounded-full border px-3 text-[14px] font-bold ${method === k ? "border-primary bg-primary/10 text-primary" : "bg-card"}`}>{t}</button>)}
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="عرض جديد" title="عرض جديد" disabled={busy} onClick={() => { if (!confirm("بدء عرض جديد ومسح الاختيارات؟")) return; setSelected({}); setCustoms({}); setPhone(""); setName(""); setCity(""); setNotes(""); setResult(null); setCalc(null); }}><RotateCcw className="h-4 w-4" /></Button>
        </div>
      </div>

      {(branch === "سكني" || (branch === "تجاري" && method)) && <div className="space-y-2">
        <div className="flex gap-2">
          <Input inputMode="decimal" aria-label="قيمة الاستهلاك" className="h-11 flex-1 rounded-full px-4 text-[15px]" placeholder={branch === "سكني" || method === "bill" ? "الفاتورة الشهرية (ريال)" : method === "kwh" ? "الاستهلاك الشهري (كيلووات)" : "الديزل الشهري (لتر)"} value={calcValue} onChange={(e) => setCalcValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runCalc()} />
          <button type="button" className="h-11 rounded-full bg-primary px-5 text-[15px] font-bold text-primary-foreground" onClick={runCalc}>عرض</button>
        </div>
        {calc && <div className="space-y-2 rounded-xl bg-muted/50 p-2"><p className="text-[13px] font-semibold text-muted-foreground">{calc.note}</p>
          {resList.map((r) => readyCard(r.code, r.label, () => loadReady(r.code, r.lines, "سكني"), true))}
          {comList.map((r) => readyCard(r.code, r.label, () => loadReady(r.code, r.lines, "تجاري"), true))}
        </div>}
      </div>}

      <div className="flex justify-end"><button type="button" onClick={() => setReadyOpen((o) => !o)} className="flex h-11 items-center gap-2 rounded-full bg-muted px-5 text-[15px] font-bold"><History className="h-5 w-5" />العروض الجاهزة ({readyQuotes.length + commercialQuotes.length})</button></div>

      {readyOpen && <div className="rounded-2xl border bg-muted/30 p-2">
        <div className="mb-2 grid grid-cols-2 gap-2">{(["سكني", "تجاري"] as const).map((t) => <button key={t} type="button" onClick={() => setReadyTab(t)} className={`h-11 rounded-xl border text-[16px] font-bold ${readyTab === t ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{t === "سكني" ? "منظومات سكنية" : "منظومات تجارية"}</button>)}</div>
        <div className="max-h-[52dvh] space-y-2 overflow-y-auto px-1 pb-1">
          {readyTab === "سكني"
            ? groupBy(readyQuotes, (r) => `إنفرتر ${r.invKw} كيلو`).map(([g, list]) => <div key={g} className="space-y-2"><p className="pt-1 text-[14px] font-bold text-primary">{g}</p>{list.map((r) => readyCard(r.code, r.label, () => loadReady(r.code, r.lines, "سكني")))}</div>)
            : groupBy(commercialQuotes, (r) => r.group).map(([g, list]) => <div key={g} className="space-y-2"><p className="pt-1 text-[14px] font-bold text-primary">{g}</p>{list.map((r) => readyCard(r.code, r.label, () => loadReady(r.code, r.lines, "تجاري")))}</div>)}
        </div>
        <Link to="/quotes" className="mt-2 block text-center text-[13px] font-semibold text-muted-foreground underline">عروض الأسعار المحفوظة</Link>
      </div>}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-3">
          <div className="grid grid-cols-2 gap-2">{groups.map((value) => { const Icon = icons[value] ?? Package; const n = countIn(value); const active = group === value; return <button key={value} type="button" disabled={busy} onClick={() => { setGroup(value); setSearch(""); }} className={`relative flex h-9 min-w-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold transition ${active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:border-primary/50"}`}>
            {n > 0 && <span className="absolute -top-2 start-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] text-destructive-foreground ring-2 ring-background">{n}</span>}
            <Icon className={`h-4 w-4 shrink-0 ${active ? "" : "text-primary"}`} /><span className="min-w-0 flex-1 truncate text-start">{label(value)}</span><span className={`shrink-0 text-[12px] font-normal ${active ? "opacity-80" : "text-muted-foreground"}`}>{value === CUSTOM ? "حر" : items.filter((i) => catOf(i) === value).length}</span></button>; })}</div>

          <section className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex items-center justify-between gap-2 border-b bg-muted/40 p-3"><h2 className="min-w-0 text-[18px] font-bold">{label(group)}</h2>{group !== CUSTOM && <div className="relative w-44 shrink-0"><Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="h-9 rounded-full ps-9 text-[14px]" aria-label="بحث الأصناف" placeholder="بحث…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>}</div>
            {group === CUSTOM ? <div className="space-y-2 p-3">
              <Input aria-label="اسم الصنف المخصص" placeholder="اسم الصنف أو الخدمة" className="h-10 text-[14px]" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2"><Input aria-label="سعر الصنف بالدولار" inputMode="decimal" placeholder="السعر $" className="h-10 text-[14px]" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /><Input aria-label="الوحدة" placeholder="الوحدة" className="h-10 text-[14px]" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} /><Button className="h-10" onClick={addCustom}><Plus className="h-4 w-4" />إضافة</Button></div>
            </div> : <>
              <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_7.5rem] gap-2 border-b px-3 py-2 text-[15px] font-semibold text-muted-foreground"><span className="ps-9">الصنف</span><span className="text-center">السعر</span><span className="text-center">الكمية</span></div>
              <div className="max-h-[480px] overflow-y-auto lg:max-h-[600px]">{!rows.length ? <p className="p-6 text-center text-sm text-muted-foreground">لا توجد أصناف</p> : rows.map((item) => { const on = selected[item.code] != null; const spec = productSpecs(item.code, item.specs)[0]; return <div key={item.code} className={`grid grid-cols-[minmax(0,1fr)_5.5rem_7.5rem] items-center gap-2 border-b px-3 py-3 last:border-0 ${on ? "bg-primary/10" : ""}`}>
                <button type="button" disabled={item.price == null || busy} onClick={() => on ? remove(item.code) : quantity(item.code, 1)} className="flex min-w-0 items-center gap-2 text-start" aria-pressed={on} aria-label={`اختيار ${item.name}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>{on && <Check className="h-4 w-4" />}</span>
                  <span className="min-w-0"><span className="block break-words text-[15px] font-bold leading-6">{item.name}</span>{spec && <span className="block truncate text-[12px] text-muted-foreground">{spec}</span>}</span>
                </button>
                <span className="text-center"><b dir="ltr" className="text-[15px] text-primary">{item.price == null ? "—" : formatMoney(item.price)}</b><span className="block text-[11px] text-muted-foreground">/ {item.unit || "حبه"}</span></span>
                {on ? <div className="flex items-center justify-center gap-1"><button type="button" aria-label="زيادة" className="h-8 w-8 rounded-full bg-muted" onClick={() => quantity(item.code, (selected[item.code] ?? 1) + 1)}><Plus className="mx-auto h-4 w-4" /></button><Input aria-label={`كمية ${item.name}`} type="number" min="0.01" step="any" className="h-8 w-12 rounded-lg px-1 text-center text-[15px] font-bold" value={selected[item.code] || ""} onChange={(e) => quantity(item.code, Number(e.target.value))} /><button type="button" aria-label="تقليل" className="h-8 w-8 rounded-full bg-muted disabled:opacity-40" disabled={(selected[item.code] ?? 1) <= 1} onClick={() => quantity(item.code, (selected[item.code] ?? 1) - 1)}><Minus className="mx-auto h-4 w-4" /></button></div> : <span />}
              </div>; })}</div>
            </>}
          </section>
        </div>

        <section className="min-w-0 space-y-3 rounded-2xl border bg-card p-3 lg:sticky lg:top-20">
          <select aria-label="العميل" className={`${selectCls} h-10 w-full rounded-xl text-[14px]`} value={phone} disabled={busy} onChange={(e) => { const c = customers.find((x) => x.phone === e.target.value); setPhone(e.target.value); setName(c?.name ?? ""); setCity(c?.city ?? ""); change(); }}><option value="">— العميل: جديد / بدون —</option>{customers.map((c) => <option key={c.phone} value={c.phone}>{c.name || c.phone} — {c.phone}</option>)}</select>
          <div className="grid grid-cols-3 gap-2"><Input aria-label="اسم العميل" placeholder="الاسم" className="h-10 rounded-xl text-[14px]" value={name} disabled={busy} onChange={(e) => { setName(e.target.value); change(); }} /><Input aria-label="المدينة" placeholder="المدينة" className="h-10 rounded-xl text-[14px]" value={city} disabled={busy} onChange={(e) => { setCity(e.target.value); change(); }} /><Input aria-label="الهاتف" placeholder="الهاتف" dir="ltr" className="h-10 rounded-xl text-[14px]" value={phone} disabled={busy} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); change(); }} /></div>
          <div className="flex gap-2"><select aria-label="عملة العرض" className={`${selectCls} h-9 flex-1 rounded-xl text-[13px]`} value={currency} disabled={busy} onChange={(e) => { setCurrency(e.target.value === "YER" ? "YER" : "USD"); change(); }}><option value="USD">دولار أمريكي</option><option value="YER">ريال يمني</option></select>{currency === "YER" && <Input aria-label="سعر الصرف" type="number" min="0.01" step="any" placeholder="سعر الصرف" className="h-9 w-28 rounded-xl text-[13px]" value={rate} onChange={(e) => { setRate(e.target.value); change(); }} />}</div>
          <div className="flex items-center justify-between"><h2 className="text-[18px] font-bold">الأصناف المختارة</h2><span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-[13px] font-bold text-destructive-foreground">{lines.length}</span></div>
          {!lines.length ? <div className="flex min-h-16 items-center justify-center rounded-xl border border-dashed text-[13px] text-muted-foreground">لا توجد أصناف مختارة</div> : <ul className="space-y-2">{lines.map((line) => <li key={line.code} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
            <div className="min-w-0 flex-1 space-y-1"><p className="text-[15px] font-bold leading-6">{line.name}</p>{!!line.specs?.length && <ul className="border-s-2 border-primary/60 ps-2 text-[13px] leading-6 text-muted-foreground">{line.specs.map((s, i) => <li key={i}>{s}</li>)}</ul>}<p dir="rtl" className="text-[13px] text-muted-foreground">{line.quantity} × <span dir="ltr">{formatMoney(line.price)}</span> / {line.unit || "حبه"}</p></div>
            <b dir="ltr" className="shrink-0 text-[15px] text-primary">{formatMoney(Math.round(line.price * line.quantity * 100) / 100)}</b>
            <button type="button" className="shrink-0 text-destructive" aria-label={`إزالة ${line.name}`} disabled={busy} onClick={() => remove(line.code)}><Trash2 className="h-5 w-5" /></button>
          </li>)}</ul>}
          <Input aria-label="ملاحظات عرض السعر" placeholder="ملاحظات على العرض (اختياري)" className="h-11 rounded-xl text-[14px]" value={notes} disabled={busy} onChange={(e) => { setNotes(e.target.value); change(); }} />
          <div className="flex items-center justify-between rounded-xl bg-foreground px-4 py-3 text-background"><span className="text-[15px] font-semibold">الإجمالي</span><b dir="ltr" className="text-[20px] tabular-nums text-accent">{formatMoney(total)}</b></div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-bold text-primary-foreground disabled:opacity-50" disabled={busy || !lines.length} onClick={() => result ? setPreview(true) : make()}><Printer className="h-5 w-5" />{busy ? "جارٍ الإنشاء…" : result ? "عرض PDF" : "إنشاء عرض السعر"}</button>
            <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-foreground text-[15px] font-bold text-background disabled:opacity-50" disabled={sending} onClick={share}><Share2 className="h-5 w-5" />{sending ? "جارٍ الإرسال…" : "مشاركة مع عميل"}</button>
          </div>
          {result && <Button variant="ghost" className="h-9 w-full gap-2 text-[13px]" onClick={download}><Download className="h-4 w-4" />{result.invoice} — تحميل PDF</Button>}
        </section>
      </div>
    </section>
    <Dialog open={preview} onOpenChange={setPreview}><DialogContent dir="rtl" className="flex h-[90dvh] max-w-4xl flex-col gap-2 p-3"><DialogTitle className="pe-8 text-sm">عرض سعر {result?.invoice}</DialogTitle><DialogDescription className="sr-only">معاينة عرض السعر الرسمي</DialogDescription>{result && <><iframe srcDoc={result.html} sandbox="" title="معاينة عرض السعر PDF" className="min-h-0 w-full flex-1 rounded-md border bg-card" /><div className="flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" onClick={download}><Download className="h-4 w-4" />تحميل PDF</Button><Button size="sm" variant="outline" onClick={() => window.open(result.url, "_blank", "noopener,noreferrer")}><Printer className="h-4 w-4" />فتح للطباعة</Button><Button size="sm" disabled={sending} onClick={share}><Send className="h-4 w-4" />إرسال</Button></div></>}</DialogContent></Dialog>
  </div>;
}
