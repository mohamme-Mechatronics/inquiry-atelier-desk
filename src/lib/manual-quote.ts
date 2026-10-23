import { z } from "zod";

export const quoteInput = z.object({
  id: z.string().uuid(),
  phone: z.string().min(1).max(30).regex(/^-?\d+$/),
  name: z.string().trim().min(1).max(150),
  city: z.string().trim().max(150),
  branch: z.enum(["سكني", "تجاري", "زراعي / غطاسات"]),
  notes: z.string().trim().max(2000),
  lines: z.array(z.object({ code: z.string().min(1).max(100), quantity: z.number().finite().positive().max(100000) })).min(1).max(100),
}).refine((data) => data.branch !== "زراعي / غطاسات", { message: "عروض الغطاسات تتطلب حزمة معتمدة من المهندس" });
export type QuoteInput = z.infer<typeof quoteInput>;
export type QuoteLine = { code: string; name: string; unit: string | null; price: number; quantity: number };
export const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
export function quoteTotal(lines: QuoteLine[]) {
  return Math.round(lines.reduce((sum, line) => sum + Math.round(line.price * line.quantity * 100) / 100, 0) * 100) / 100;
}
export function pricedLines(items: { code: string; name: string; unit: string | null; price: number | null }[], selections: { code: string; quantity: number }[]): QuoteLine[] {
  const seen = new Set<string>();
  return selections.map((selection) => {
    const item = items.find((row) => row.code === selection.code);
    if (!item || item.price == null || !Number.isFinite(item.price) || item.price < 0) throw new Error("الصنف غير متاح أو سعره غير مسجل");
    if (seen.has(selection.code)) throw new Error("الصنف مكرر");
    seen.add(selection.code);
    if (!Number.isFinite(selection.quantity) || selection.quantity <= 0) throw new Error("أدخل كمية أكبر من صفر");
    return { ...item, price: item.price, quantity: selection.quantity };
  });
}