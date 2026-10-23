import botData from "./bot-quote-data.json";

export function productSpecs(code: string, stored: unknown): string[] {
  const overrides = Array.isArray(stored) ? stored.filter((v): v is string => typeof v === "string" && !v.startsWith("PDF_URL=")) : [];
  if (overrides.length) return overrides;
  return (botData.specs as Record<string, string[]>)[code] ?? [];
}

export const quoteCategories = ["الإنفرترات", "البطاريات", "الألواح", "صناديق حماية DC", "لوحات حماية AC", "راكات وكبائن التخزين", "استندات المنظومات", "كنترولات وحماية البطاريات", "الكابلات والتوصيلات", "أصناف أخرى", "الغطاسات والمضخات"];
export const quoteCategory = (group: string, code = "") => /^ctrl_|^bat_protect/i.test(code) ? "كنترولات وحماية البطاريات" : ["الكبائن", "الراكات"].includes(group) ? "راكات وكبائن التخزين" : group;

export type ReadyLine = { code: string | null; name: string; specs: string[]; unit: string; quantity: number; price: number };
export type ResidentialQuote = (typeof botData.ready)[number];
export type CommercialQuote = (typeof botData.commercial)[number];
export const readyQuotes: ResidentialQuote[] = botData.ready;
export const commercialQuotes: CommercialQuote[] = botData.commercial;

/** Bot rule: kWh price 250 YER; daily need = bill / 250 / 30; nearest residential range (8 and 12 kW never below need). */
export const KWH_PRICE = 250;
export function pickResidential(bill: number): ResidentialQuote[] | "commercial" | null {
  if (!Number.isFinite(bill) || bill <= 0) return null;
  const daily = bill / KWH_PRICE / 30;
  const max = Math.max(...readyQuotes.map((r) => r.range));
  if (daily > max + 0.0001) return "commercial";
  let best: number | null = null; let out: ResidentialQuote[] = [];
  for (const r of readyQuotes) {
    if ((r.invKw === 8 || r.invKw === 12) && r.range < daily - 0.0001) continue;
    const d = Math.abs(r.range - daily);
    if (best === null || d < best - 0.0001) { best = d; out = [r]; } else if (Math.abs(d - best) <= 0.0001) out.push(r);
  }
  return out;
}

/** Bot rule: monthly kWh = bill/250, kWh, or diesel litres/0.27; pick smallest system whose daily output covers monthly/30. */
export type CommercialMethod = "bill" | "kwh" | "diesel";
export function commercialMonthlyKwh(method: CommercialMethod, value: number) {
  return method === "bill" ? value / KWH_PRICE : method === "kwh" ? value : value / 0.27;
}
export function pickCommercial(method: CommercialMethod, value: number): CommercialQuote | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const daily = commercialMonthlyKwh(method, value) / 30;
  return [...commercialQuotes].sort((a, b) => a.daily - b.daily || a.kw - b.kw).find((q) => q.daily >= daily - 0.0001) ?? null;
}
