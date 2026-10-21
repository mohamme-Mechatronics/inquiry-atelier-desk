export const STATUSES: Record<string, { label: string; cls: string }> = {
  new: { label: "جديد", cls: "bg-secondary text-secondary-foreground" },
  follow: { label: "قيد المتابعة", cls: "bg-accent text-accent-foreground" },
  won: { label: "تم البيع", cls: "bg-primary text-primary-foreground" },
  lost: { label: "ملغي", cls: "bg-muted text-muted-foreground line-through" },
};
export const TICKET_STATUSES: Record<string, string> = { open: "مفتوحة", working: "قيد المعالجة", closed: "مغلقة" };
export const STAGES: Record<string, string> = {
  buy: "شراء", quote: "عرض سعر", sld: "مخطط", cod: "دفع عند الاستلام", human: "يحتاج موظف", support: "دعم فني",
};
export const fmt = (d: string) =>
  new Date(d).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" });
