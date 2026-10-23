import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { quoteInput, pricedLines, quoteTotal, money } from "@/lib/manual-quote";

export const generateManualQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => quoteInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: roles, error: roleError } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (roleError || !roles?.length) throw new Error("غير مصرح");
    // Manual equipment selection is not an engineer-approved agricultural package.
    if (data.branch === "زراعي / غطاسات") throw new Error("عروض الغطاسات تتطلب حزمة معتمدة من المهندس عبر مسار البوت");
    const { data: customer, error: customerError } = await context.supabase.from("customers").select("phone").eq("phone", data.phone).single();
    if (customerError || !customer) throw new Error("اختر عميلاً مسجلاً");
    const { data: catalog, error } = await context.supabase.from("catalog_items").select("code,name,unit,price").in("code", data.lines.map((line) => line.code));
    if (error || !catalog) throw new Error("تعذر تحميل الأسعار");
    const lines = pricedLines(catalog, data.lines);
    const total = quoteTotal(lines);
    const invoice = `TMK-${data.id.slice(0, 8).toUpperCase()}`;
    const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
    const { default: logo } = await import("@/assets/tamkeen-logo-clean.png.asset.json");
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${invoice}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap"><style>@page{size:A4;margin:16mm}body{font-family:'IBM Plex Sans Arabic',sans-serif;font-size:12px;color:oklch(0.24 0.08 265)}header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid oklch(0.76 0.12 80);padding-bottom:12px}img{height:65px}h1{font-size:24px;margin:0}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:20px 0}table{border-collapse:collapse;width:100%}th{background:oklch(0.3 0.11 265);color:oklch(0.98 0.01 85);text-align:right}th,td{padding:10px;border-bottom:1px solid oklch(0.91 0.012 260)}tr{break-inside:avoid}.total{font-size:19px;font-weight:700;text-align:left;margin:20px 0}.notes{white-space:pre-wrap}footer{border-top:1px solid oklch(0.91 0.012 260);margin-top:30px;padding-top:12px;text-align:center}</style></head><body><header><div><h1>عرض سعر رسمي</h1><b>تمكين للحلول التقنية الذكية</b></div><img src="${esc(logo.url)}" alt="تمكين"></header><div class="meta"><span>رقم العرض: ${invoice}</span><span>التاريخ: ${new Date().toLocaleDateString("en-GB")}</span><span>العميل: ${esc(data.name)}</span><span>الرقم: <b dir="ltr">${esc(data.phone)}</b></span><span>الموقع: ${esc(data.city || "—")}</span><span>المنظومة: ${esc(data.branch)}</span></div><table><thead><tr><th>الصنف والمواصفات</th><th>الوحدة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${lines.map((line) => `<tr><td>${esc(line.name)}</td><td>${esc(line.unit || "—")}</td><td>${line.quantity}</td><td dir="ltr">${money(line.price)}</td><td dir="ltr">${money(Math.round(line.price * line.quantity * 100) / 100)}</td></tr>`).join("")}</tbody></table><div class="total">الإجمالي: <span dir="ltr">${money(total)}</span></div>${data.notes ? `<div class="notes"><b>ملاحظات:</b><br>${esc(data.notes)}</div>` : ""}<footer>تمكين للحلول التقنية الذكية</footer></body></html>`;
    const secret = process.env["BOT_SECRET"];
    if (!secret) throw new Error("خدمة PDF غير جاهزة");
    const { getRequest } = await import("@tanstack/react-start/server");
    const form = new FormData();
    form.append("files", new File([html], "index.html", { type: "text/html" }));
    const response = await fetch(new URL("/api/public/bot-pdf", getRequest().url), { method: "POST", headers: { "x-bot-secret": secret }, body: form });
    if (!response.ok) throw new Error("تعذر إنشاء PDF، حاول مجدداً");
    const path = `${context.userId}/quotes/${data.id}.pdf`;
    const pdf = await response.arrayBuffer();
    const { error: uploadError } = await context.supabase.storage.from("chat-files").upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (uploadError) throw new Error("تعذر حفظ PDF");
    const details = `${data.branch}\n${lines.map((line) => `${line.name} × ${line.quantity}: ${money(line.price * line.quantity)}`).join("\n")}\n${data.notes}`;
    const { error: saveError } = await context.supabase.from("orders").upsert({ id: data.id, phone: data.phone, name: data.name, city: data.city, invoice_no: invoice, amount: money(total), details });
    if (saveError) throw new Error("تعذر حفظ العرض في الطلبات");
    const { data: signed, error: signError } = await context.supabase.storage.from("chat-files").createSignedUrl(path, 3600);
    if (signError || !signed) throw new Error("تعذر فتح PDF");
    return { url: signed.signedUrl, path, invoice, total, name: `${invoice}.pdf`, html };
  });