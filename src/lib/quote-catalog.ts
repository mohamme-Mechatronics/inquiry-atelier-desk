import botData from "./bot-quote-data.json";

export function productSpecs(code: string, stored: unknown): string[] {
  const overrides = Array.isArray(stored) ? stored.filter((v): v is string => typeof v === "string" && !v.startsWith("PDF_URL=")) : [];
  if (overrides.length) return overrides;
  return (botData.specs as Record<string, string[]>)[code] ?? [];
}

export const quoteCategories = ["الإنفرترات", "البطاريات", "الألواح", "صناديق حماية DC", "لوحات حماية AC", "راكات وكبائن التخزين", "استندات المنظومات", "الكابلات والتوصيلات", "أصناف أخرى", "الغطاسات والمضخات"];
export const quoteCategory = (group: string) => ["الكبائن", "الراكات"].includes(group) ? "راكات وكبائن التخزين" : group;
export const readyQuotes = botData.ready;