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

// WhatsApp numbers are Yemeni (967 + 9 digits); Telegram customers are stored by chat id.
export type Channel = "whatsapp" | "telegram";
export const channelOf = (phone: string): Channel =>
  /^967\d{9}$/.test(phone) || phone.length >= 11 ? "whatsapp" : "telegram";
export const CHANNELS: Record<Channel, { label: string; cls: string }> = {
  whatsapp: { label: "واتساب", cls: "bg-chart-3 text-primary-foreground" },
  telegram: { label: "تليجرام", cls: "bg-chart-5 text-primary-foreground" },
};

export const QUICK_REPLIES = [
  { label: "ترحيب", text: "أهلاً بك في تمكين للحلول التقنية الذكية 🌞 كيف نخدمك اليوم؟" },
  { label: "جاري المراجعة", text: "شكراً لتواصلك، طلبك قيد المراجعة وسنرد عليك خلال وقت قصير." },
  { label: "تأكيد دراسة", text: "تم استلام بياناتك، وسيتم تجهيز الدراسة الفنية وإرسالها لك قريباً." },
  { label: "بيانات الدفع", text: "يمكنك الدفع عبر الحساب البنكي أو التحويل، وسنرسل لك التفاصيل الآن." },
  { label: "شكر", text: "شكراً لثقتك بتمكين، نحن في خدمتك دائماً." },
];
