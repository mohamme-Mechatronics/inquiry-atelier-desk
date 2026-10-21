// Report exports: CSV (Excel-friendly UTF-8 with BOM) and printable Arabic PDF via the browser print dialog.
export type Table = { title: string; file: string; headers: string[]; rows: unknown[][] };

const today = () => new Date().toISOString().slice(0, 10);

export function exportCsv(t: Table) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "\uFEFF" + [t.headers, ...t.rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `tamkeen-${t.file}-${today()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

const html = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function exportPdf(t: Table, logoUrl: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  const logo = new URL(logoUrl, location.origin).href;
  w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${html(t.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
<style>
@page{size:A4 landscape;margin:12mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'IBM Plex Sans Arabic',sans-serif;color:#0f1c3a;margin:0;font-size:11px}
header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #c9a24a;padding-bottom:10px;margin-bottom:14px}
header img{height:56px}h1{margin:0;font-size:20px}.meta{color:#666;font-size:11px}
table{width:100%;border-collapse:collapse}th{background:#0f1c3a;color:#fff;padding:7px 6px;text-align:right}
td{padding:6px;border-bottom:1px solid #e5e7eb;vertical-align:top;white-space:pre-wrap}tr:nth-child(even) td{background:#f8f6f0}
tr{break-inside:avoid}footer{margin-top:14px;color:#888;font-size:10px;text-align:center}
</style></head><body>
<header><div><h1>${html(t.title)}</h1><div class="meta">تاريخ التقرير: ${new Date().toLocaleString("ar")} — عدد السجلات: ${t.rows.length}</div></div><img src="${logo}"></header>
<table><thead><tr>${t.headers.map((h) => `<th>${html(h)}</th>`).join("")}</tr></thead>
<tbody>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${html(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>
<footer>تمكين للحلول التقنية الذكية</footer>
<script>document.fonts.ready.then(()=>{const i=document.querySelector('img');const go=()=>setTimeout(()=>print(),200);i.complete?go():(i.onload=i.onerror=go)})</script>
</body></html>`);
  w.document.close();
}
