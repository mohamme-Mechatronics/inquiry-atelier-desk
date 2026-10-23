import { z } from "zod";
import { productSpecs } from "./quote-catalog";

export const quoteInput = z.object({
  id: z.string().uuid(),
  phone: z.string().min(1).max(30).regex(/^-?\d+$/),
  name: z.string().trim().min(1).max(150),
  city: z.string().trim().max(150),
  branch: z.enum(["سكني", "تجاري", "زراعي / غطاسات"]),
  notes: z.string().trim().max(2000),
  currency: z.enum(["USD", "YER"]).default("USD"),
  exchangeRate: z.number().finite().positive().max(100000).default(1),
  lines: z.array(z.object({
    code: z.string().min(1).max(100),
    quantity: z.number().finite().positive().max(100000),
    custom: z.object({ name: z.string().trim().min(1).max(300), unit: z.string().trim().max(40), price: z.number().finite().min(0).max(10000000), specs: z.array(z.string().max(500)).max(40) }).optional(),
  })).min(1).max(100),
}).refine((data) => data.branch !== "زراعي / غطاسات", { message: "عروض الغطاسات تتطلب حزمة معتمدة من المهندس" });
export type QuoteInput = z.infer<typeof quoteInput>;
export type QuoteLine = { code: string; name: string; unit: string | null; price: number; quantity: number; specs?: string[] };
export const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
export const quoteMoney = (usd: number, currency: "USD" | "YER", rate: number) => currency === "USD" ? money(usd) : `${(Math.round(usd * rate * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })} ر.ي`;
export function quoteTotal(lines: QuoteLine[]) {
  return Math.round(lines.reduce((sum, line) => sum + Math.round(line.price * line.quantity * 100) / 100, 0) * 100) / 100;
}
/** Catalog lines always use the current catalog price; custom lines (code starting with "custom:") carry their own entered price. */
export function pricedLines(items: { code: string; name: string; unit: string | null; price: number | null; specs?: unknown }[], selections: { code: string; quantity: number; custom?: { name: string; unit: string; price: number; specs: string[] } | undefined }[]): QuoteLine[] {
  const seen = new Set<string>();
  return selections.map((selection) => {
    if (seen.has(selection.code)) throw new Error("الصنف مكرر");
    seen.add(selection.code);
    if (!Number.isFinite(selection.quantity) || selection.quantity <= 0) throw new Error("أدخل كمية أكبر من صفر");
    if (selection.code.startsWith("custom:")) {
      const c = selection.custom;
      if (!c || !Number.isFinite(c.price) || c.price < 0) throw new Error("أدخل سعر الصنف المخصص");
      return { code: selection.code, name: c.name, unit: c.unit || "حبه", price: c.price, quantity: selection.quantity, specs: c.specs };
    }
    const item = items.find((row) => row.code === selection.code);
    if (!item || item.price == null || !Number.isFinite(item.price) || item.price < 0) throw new Error("الصنف غير متاح أو سعره غير مسجل");
    return { ...item, price: item.price, quantity: selection.quantity, specs: productSpecs(item.code, item.specs) };
  });
}