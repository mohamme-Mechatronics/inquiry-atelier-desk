export const STATUSES: Record<string, { label: string; cls: string }> = {
  new: { label: "جديد", cls: "bg-info/10 text-info ring-1 ring-inset ring-info/20" },
  follow: { label: "قيد المتابعة", cls: "bg-warning/15 text-warning-foreground ring-1 ring-inset ring-warning/30" },
  won: { label: "تم البيع", cls: "bg-success/10 text-success ring-1 ring-inset ring-success/20" },
  lost: { label: "ملغي", cls: "bg-muted text-muted-foreground ring-1 ring-inset ring-border" },
};
export const TICKET_STATUSES: Record<string, string> = { open: "مفتوحة", working: "قيد المعالجة", closed: "مغلقة" };
export const TICKET_CLS: Record<string, string> = {
  open: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",
  working: "bg-warning/15 text-warning-foreground ring-1 ring-inset ring-warning/30",
  closed: "bg-success/10 text-success ring-1 ring-inset ring-success/20",
};
export const STAGES: Record<string, string> = {
  buy: "شراء", quote: "عرض سعر", sld: "مخطط", cod: "دفع عند الاستلام", human: "يحتاج موظف", support: "دعم فني",
};
export const fmt = (d: string) =>
  new Date(d).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" });

// Short relative time for lists ("قبل 5 د").
export const ago = (d: string) => {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "الآن";
  if (s < 3600) return `قبل ${Math.floor(s / 60)} د`;
  if (s < 86400) return `قبل ${Math.floor(s / 3600)} س`;
  if (s < 86400 * 7) return `قبل ${Math.floor(s / 86400)} يوم`;
  return new Date(d).toLocaleDateString("ar", { day: "numeric", month: "short" });
};

// One-line preview of a bot message: drops decorative separators and *bold* markers.
export const preview = (t?: string | null) =>
  (t ?? "").replace(/[━─═_~*]+/g, " ").replace(/\s+/g, " ").trim();

// WhatsApp numbers are Yemeni (967 + 9 digits); Telegram customers are stored by chat id.
export type Channel = "whatsapp" | "telegram";
export const channelOf = (phone: string): Channel =>
  /^967\d{9}$/.test(phone) || phone.length >= 11 ? "whatsapp" : "telegram";
export const CHANNELS: Record<Channel, { label: string; cls: string; dot: string }> = {
  whatsapp: { label: "واتساب", cls: "bg-whatsapp/10 text-whatsapp ring-1 ring-inset ring-whatsapp/25", dot: "bg-whatsapp" },
  telegram: { label: "تليجرام", cls: "bg-telegram/10 text-telegram ring-1 ring-inset ring-telegram/25", dot: "bg-telegram" },
};

export const QUICK_REPLIES = [
  { label: "ترحيب", text: "أهلاً بك في تمكين للحلول التقنية الذكية 🌞 كيف نخدمك اليوم؟" },
  { label: "جاري المراجعة", text: "شكراً لتواصلك، طلبك قيد المراجعة وسنرد عليك خلال وقت قصير." },
  { label: "تأكيد دراسة", text: "تم استلام بياناتك، وسيتم تجهيز الدراسة الفنية وإرسالها لك قريباً." },
  { label: "بيانات الدفع", text: "يمكنك الدفع عبر الحساب البنكي أو التحويل، وسنرسل لك التفاصيل الآن." },
  { label: "شكر", text: "شكراً لثقتك بتمكين، نحن في خدمتك دائماً." },
];
