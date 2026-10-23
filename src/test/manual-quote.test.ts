import { describe, it, expect } from "vitest";
import { pricedLines, quoteTotal, quoteInput } from "../lib/manual-quote";

describe("manual quotation calculations", () => {
  const panel = { code: "PV_SUNTECH_595", name: "لوح", unit: "حبه", price: 110 };
  const items = [panel, { code: "INV_LIPOWER_6_2K", name: "إنفرتر", unit: "حبه", price: 380 }];
  it("multiplies actual catalog prices by selected quantities", () => {
    expect(quoteTotal(pricedLines(items, [{ code: "PV_SUNTECH_595", quantity: 6 }, { code: "INV_LIPOWER_6_2K", quantity: 1 }]))).toBe(1040);
  });
  it("uses the current catalog price when generating a quote", () => {
    expect(quoteTotal(pricedLines([{ ...panel, price: 120 }], [{ code: "PV_SUNTECH_595", quantity: 6 }]))).toBe(720);
  });
  it("rejects unpriced or unavailable products", () => {
    expect(() => pricedLines([{ ...panel, price: null }], [{ code: "PV_SUNTECH_595", quantity: 1 }])).toThrow();
    expect(() => pricedLines(items, [{ code: "missing", quantity: 1 }])).toThrow();
  });
  it("rejects zero and duplicate quantities", () => {
    expect(() => pricedLines(items, [{ code: "PV_SUNTECH_595", quantity: 0 }])).toThrow();
    expect(() => pricedLines(items, [{ code: "PV_SUNTECH_595", quantity: 1 }, { code: "PV_SUNTECH_595", quantity: 2 }])).toThrow();
  });
  it("rounds money without floating point drift", () => {
    expect(quoteTotal([{ ...panel, price: 0.1, quantity: 3 }])).toBe(0.3);
  });
  it("requires customer and selected products", () => {
    expect(quoteInput.safeParse({ id: "c4bdcf04-a635-4b38-b373-f46d30a4c311", phone: "", name: "", city: "", branch: "سكني", notes: "", lines: [] }).success).toBe(false);
  });
  it("does not issue unapproved manual agricultural quotations", () => {
    expect(quoteInput.safeParse({ id: "c4bdcf04-a635-4b38-b373-f46d30a4c311", phone: "967777687107", name: "عميل", city: "", branch: "زراعي / غطاسات", notes: "", lines: [{ code: "PV_SUNTECH_595", quantity: 1 }] }).success).toBe(false);
  });
});