import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Bot, MessageCircle, Search, Send, StickyNote, Headset, Zap, ExternalLink, Paperclip, Package, UserCheck, Info, X, Copy, Phone, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar, ChannelBadge, EmptyState, MessageBubble, Skeleton } from "@/components/admin";
import { QUICK_REPLIES, channelOf, ago, preview } from "@/lib/crm";
import { sendReply, sendFile } from "@/lib/reply.functions";
import { useTeam } from "@/lib/team";
import { useAuth } from "@/hooks/use-auth";

type Search = { p?: string };

export const Route = createFileRoute("/_team/chats")({
  validateSearch: (s: Record<string, unknown>): Search => (typeof s["p"] === "string" ? { p: s["p"] as string } : {}),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "المحادثات — تمكين" },
      { name: "description", content: "محادثات عملاء واتساب وتليجرام والرد عليهم من اللوحة" },
      { property: "og:title", content: "المحادثات — تمكين" },
      { property: "og:description", content: "محادثات عملاء واتساب وتليجرام والرد عليهم من اللوحة" },
    ],
  }),
  component: Chats,
});

const SEEN_KEY = "tmk_seen";
const readSeen = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}"); } catch { return {}; }
};

function Chats() {
  const { p } = Route.useSearch();
  const nav = useNavigate({ from: "/chats" });
  const [q, setQ] = useState("");
  const me = useAuth().session?.user.id;
  const [f, setF] = useState<"all" | "mine" | "unread" | "paused" | "whatsapp" | "telegram">("all");
  const [seen, setSeen] = useState<Record<string, string>>({});
  useEffect(() => {
    setSeen(readSeen());
  }, []);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await supabase.from("customers").select("*").order("last_at", { ascending: false }).limit(1000)).data ?? [],
    refetchInterval: 10000,
  });

  const unread = (c: { phone: string; last_at: string }) => !seen[c.phone] || seen[c.phone]! < c.last_at;
  const shown = list.filter((c) => {
    if (q && !`${c.phone} ${c.name ?? ""}`.includes(q)) return false;
    if (f === "unread") return unread(c);
    if (f === "paused") return c.bot_paused;
    if (f === "mine") return (c as any).assigned_to === me;
    if (f === "whatsapp" || f === "telegram") return channelOf(c.phone) === f;
    return true;
  });

  const open = (phone: string, last_at: string) => {
    const s = { ...readSeen(), [phone]: last_at };
    localStorage.setItem(SEEN_KEY, JSON.stringify(s));
    setSeen(s);
    nav({ search: { p: phone } });
  };

  const FILTERS = [
    ["all", "الكل"], ["mine", "المسندة لي"], ["unread", "غير مقروءة"], ["paused", "رد يدوي"], ["whatsapp", "واتساب"], ["telegram", "تليجرام"],
  ] as const;

  return (
    <div className="grid h-[calc(100dvh-9.25rem)] overflow-hidden rounded-xl border bg-card shadow-card grid-cols-1 md:h-[calc(100dvh-7rem)] md:grid-cols-[22rem_1fr]">
      <div className={`flex min-h-0 min-w-0 flex-col border-e ${p ? "hidden md:flex" : "flex"}`}>
        <div className="space-y-3 border-b p-3">
          <div className="flex items-center justify-between">
            <h1 className="font-sans text-base font-bold">صندوق المحادثات</h1>
            <span className="text-xs tabular-nums text-muted-foreground">{shown.length} محادثة</span>
          </div>
          <div className="relative">
            <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الرقم"
              className="h-9 w-full rounded-lg border bg-background pe-3 ps-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="scrollbar-none -mx-3 flex gap-1 overflow-x-auto px-3">
            {FILTERS.map(([k, l]) => (
              <button key={k} onClick={() => setF(k)}
                className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${f === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && <div className="space-y-3 p-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14" />)}</div>}
          {!isLoading && shown.length === 0 && <EmptyState icon={MessageCircle} title="لا توجد محادثات" hint="ستظهر محادثات العملاء هنا عند مراسلة البوت." />}
          {shown.map((c) => {
            const active = p === c.phone;
            const u = unread(c);
            return (
              <button key={c.phone} onClick={() => open(c.phone, c.last_at)}
                className={`relative flex w-full items-center gap-3 border-b px-3 py-3 text-start transition-colors hover:bg-muted/60 ${active ? "bg-secondary before:absolute before:inset-y-0 before:start-0 before:w-0.5 before:bg-accent" : ""}`}>
                <Avatar name={c.name} phone={c.phone} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`truncate text-sm ${u ? "font-bold" : "font-semibold"}`}>{c.name || c.phone}</span>
                    {c.bot_paused ? <Headset className="h-3.5 w-3.5 shrink-0 text-warning-foreground" /> : <Bot className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />}
                    <span className="ms-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">{ago(c.last_at)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <ChannelBadge phone={c.phone} />
                    <span className={`truncate text-xs ${u ? "text-foreground" : "text-muted-foreground"}`}>{preview(c.last_message)}</span>
                    {u && <span className="ms-auto h-2 w-2 shrink-0 rounded-full bg-accent" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className={`min-h-0 min-w-0 ${p ? "flex" : "hidden md:flex"} flex-col`}>
        {p ? <Conversation phone={p} onBack={() => nav({ search: {} })} /> : (
          <div className="m-auto"><EmptyState icon={MessageCircle} title="اختر محادثة لعرضها" hint="اختر عميلاً من القائمة لقراءة المحادثة والرد عليه على نفس قناته." /></div>
        )}
      </div>
    </div>
  );
}
function Conversation({ phone, onBack }: { phone: string; onBack: () => void }) {
  const qc = useQueryClient();
  const reply = useServerFn(sendReply);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(false);
  const [tools, setTools] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sendF = useServerFn(sendFile);
  const team = useTeam();
  const [showCat, setShowCat] = useState(false);
  const catalog = useQuery({
    queryKey: ["catalog-mini"], enabled: showCat,
    queryFn: async () => (await supabase.from("catalog_items").select("code,name,unit,price").order("name").limit(200)).data ?? [],
  });
  const orders = useQuery({
    queryKey: ["chat-orders", phone], enabled: info,
    queryFn: async () => (await supabase.from("orders").select("id,invoice_no,amount,method,created_at").eq("phone", phone).order("created_at", { ascending: false }).limit(20)).data ?? [],
  });
  const ch = channelOf(phone);

  const upload = async (f: File) => {
    if (f.size > 20 * 1024 * 1024) { toast.error("الملف أكبر من 20 ميجا"); return; }
    setBusy(true);
    try {
      const ext = f.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const path = `${phone}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("chat-files").upload(path, f, { contentType: f.type });
      if (error) throw new Error("تعذر رفع الملف");
      await sendF({ data: { phone, path, name: f.name, mime: f.type, caption: text.trim() } });
      setText("");
      toast.success("تم إرسال الملف");
      qc.invalidateQueries({ queryKey: ["chat", phone] });
    } catch (e: any) { toast.error(e?.message || "تعذر الإرسال"); } finally { setBusy(false); }
  };

  const assign = async (v: string) => {
    const { error } = await supabase.from("customers").update({ assigned_to: v || null }).eq("phone", phone);
    if (error) { toast.error("تعذر الإسناد"); return; }
    toast.success(v ? "تم إسناد المحادثة" : "تم إلغاء الإسناد");
    qc.invalidateQueries({ queryKey: ["chat", phone] });
    qc.invalidateQueries({ queryKey: ["customers"] });
  };

  const { data } = useQuery({
    queryKey: ["chat", phone],
    queryFn: async () => {
      const [c, m] = await Promise.all([
        supabase.from("customers").select("*").eq("phone", phone).maybeSingle(),
        supabase.from("messages").select("*").eq("phone", phone).order("created_at").limit(500),
      ]);
      return { c: c.data, msgs: m.data ?? [] };
    },
    refetchInterval: 8000,
  });
  const count = data?.msgs.length ?? 0;
  // Block body on purpose: newer browsers make scrollIntoView return a Promise,
  // and React would then try to call that Promise as the effect cleanup.
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [count, phone]);

  const togglePause = async (v: boolean) => {
    const { error } = await supabase.from("customers").update({ bot_paused: v }).eq("phone", phone);
    if (error) { toast.error("تعذر الحفظ"); return; }
    toast.success(v ? "تم إيقاف البوت — الرد الآن من الموظف" : "تم تشغيل البوت");
    qc.invalidateQueries({ queryKey: ["chat", phone] });
    qc.invalidateQueries({ queryKey: ["customers"] });
  };

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try {
      await reply({ data: { phone, text: t } });
      setText("");
      qc.invalidateQueries({ queryKey: ["chat", phone] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    } catch (e: any) {
      toast.error(e?.message || "تعذر الإرسال");
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    const t = note.trim();
    if (!t) return;
    const { error } = await supabase.from("messages").insert({ phone, direction: "note", kind: "note", text: t });
    if (error) { toast.error("تعذر حفظ الملاحظة"); return; }
    setNote("");
    toast.success("تم حفظ الملاحظة");
    qc.invalidateQueries({ queryKey: ["chat", phone] });
  };

  const c = data?.c;
  const msgs = useMemo(() => data?.msgs ?? [], [data]);
  const shownPhone = ch === "whatsapp" ? `+${phone}` : phone;
  const chatHref = ch === "whatsapp" ? `https://wa.me/${phone}` : `tg://openmessage?user_id=${phone}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background md:static md:z-auto md:h-full">
      {/* Slim app-style header */}
      <div className={`flex items-center gap-2 px-2 py-2 text-primary-foreground shadow-card ${ch === "whatsapp" ? "bg-wa-head" : "bg-tg-head"}`}>
        <button onClick={onBack} className="shrink-0 rounded-full p-1.5 hover:bg-primary-foreground/10 md:hidden" aria-label="رجوع"><ArrowRight className="h-5 w-5" /></button>
        <button onClick={() => setInfo(true)} className="flex min-w-0 flex-1 items-center gap-2 text-start">
          <Avatar name={c?.name} phone={phone} size="sm" />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold leading-tight">{c?.name || phone}</div>
            <div dir="ltr" className="truncate text-end text-[11px] tabular-nums text-primary-foreground/75">{shownPhone}</div>
          </div>
        </button>
        {c && (
          <button onClick={() => togglePause(!c.bot_paused)} aria-label={c.bot_paused ? "الموظف يرد — اضغط لتشغيل البوت" : "البوت يرد — اضغط للرد اليدوي"}
            title={c.bot_paused ? "الموظف يرد" : "البوت يرد"}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${c.bot_paused ? "bg-accent text-accent-foreground" : "hover:bg-primary-foreground/10"}`}>
            {c.bot_paused ? <Headset className="h-4.5 w-4.5" /> : <Bot className="h-4.5 w-4.5" />}
          </button>
        )}
        <button onClick={() => setInfo(true)} aria-label="معلومات العميل" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-primary-foreground/10">
          <Info className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className={`min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3 ${ch === "whatsapp" ? "chat-wa" : "chat-tg"}`}>
        {!data && [1, 2, 3].map((i) => <Skeleton key={i} className={`h-14 w-2/3 ${i % 2 ? "" : "ms-auto"}`} />)}
        {data && msgs.length === 0 && <EmptyState icon={MessageCircle} title="لا توجد رسائل بعد" />}
        {msgs.map((m) => <MessageBubble key={m.id} m={m} skin={ch} />)}
        <div ref={end} />
      </div>

      {/* Tools tray (catalog + quick replies) */}
      {tools && (
        <div className="space-y-1.5 border-t bg-card p-2">
          <div className="scrollbar-none flex gap-1 overflow-x-auto">
            <button onClick={() => setShowCat((v) => !v)}
              className="flex shrink-0 items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-medium">
              <Package className="h-3 w-3" /> الكتالوج
            </button>
            {QUICK_REPLIES.map((r) => (
              <button key={r.label} onClick={() => { setText(r.text); setTools(false); }}
                className="flex shrink-0 items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                <Zap className="h-3 w-3 text-accent" /> {r.label}
              </button>
            ))}
          </div>
          {showCat && (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border bg-background p-1">
              {catalog.isLoading && <Skeleton className="h-8" />}
              {catalog.data?.length === 0 && <p className="p-2 text-xs text-muted-foreground">لا توجد أصناف في الكتالوج</p>}
              {catalog.data?.map((it) => (
                <button key={it.code} onClick={() => { setText(`🔹 ${it.name}${it.price != null ? `\nالسعر: ${it.price}${it.unit ? " / " + it.unit : ""}` : ""}`); setShowCat(false); setTools(false); }}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-start text-xs hover:bg-muted">
                  <span className="truncate">{it.name}</span>
                  <b className="shrink-0 tabular-nums">{it.price ?? "—"}</b>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* App-style composer */}
      <div className={`flex items-end gap-1.5 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] ${ch === "whatsapp" ? "chat-wa" : "chat-tg"}`}>
        <div className="flex min-h-11 flex-1 items-end rounded-3xl bg-card px-1 shadow-card">
          <button onClick={() => setTools((v) => !v)} aria-label="ردود جاهزة" className={`flex h-11 w-9 shrink-0 items-center justify-center ${tools ? "text-accent" : "text-muted-foreground"}`}>
            <Zap className="h-5 w-5" />
          </button>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="مراسلة"
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-1 py-3 text-sm outline-none" />
          <button onClick={() => fileRef.current?.click()} disabled={busy} aria-label="إرفاق صورة أو ملف" className="flex h-11 w-9 shrink-0 items-center justify-center text-muted-foreground">
            <Paperclip className="h-5 w-5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} />
        </div>
        <button onClick={submit} disabled={busy || !text.trim()} aria-label="إرسال"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary-foreground shadow-card disabled:opacity-60 ${ch === "whatsapp" ? "bg-wa-head" : "bg-tg-head"}`}>
          <Send className="h-5 w-5 -scale-x-100" />
        </button>
      </div>

      {/* Customer info drawer */}
      {info && (
        <div className="fixed inset-0 z-[60] flex" onClick={() => setInfo(false)}>
          <div className="absolute inset-0 bg-foreground/40" />
          <aside onClick={(e) => e.stopPropagation()} className="relative ms-auto h-full w-[88%] max-w-sm space-y-3 overflow-y-auto bg-muted p-3 shadow-card">
            <button onClick={() => setInfo(false)} className="flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs"><X className="h-3.5 w-3.5" /> إغلاق</button>
            <section className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center">
              <Avatar name={c?.name} phone={phone} size="lg" />
              <h2 className="text-base font-bold">{c?.name || phone}</h2>
              <button onClick={() => { navigator.clipboard?.writeText(shownPhone); toast.success("تم نسخ الرقم"); }} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Copy className="h-3.5 w-3.5" /><span dir="ltr" className="tabular-nums">{shownPhone}</span>
              </button>
              {c && <StatusBadge status={c.status} />}
              <div className="grid w-full grid-cols-2 gap-2 pt-1">
                {ch === "whatsapp" ? (
                  <a href={`tel:+${phone}`} className="flex items-center justify-center gap-1.5 rounded-lg border bg-background py-2 text-sm font-semibold"><Phone className="h-4 w-4" /> اتصال</a>
                ) : (
                  <Link to="/customers/$phone" params={{ phone }} className="flex items-center justify-center gap-1.5 rounded-lg border bg-background py-2 text-sm font-semibold"><ExternalLink className="h-4 w-4" /> الملف</Link>
                )}
                <a href={chatHref} target="_blank" rel="noreferrer" className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-primary-foreground ${ch === "whatsapp" ? "bg-wa-head" : "bg-tg-head"}`}>
                  <MessageCircle className="h-4 w-4" /> {ch === "whatsapp" ? "واتساب" : "تليجرام"}
                </a>
              </div>
            </section>

            {c && (
              <section className="space-y-2 rounded-xl border bg-card p-3">
                <h3 className="flex items-center gap-1.5 text-sm font-bold"><Bot className="h-4 w-4 text-accent" /> من يرد على العميل</h3>
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-xs font-semibold">
                  <button onClick={() => c.bot_paused && togglePause(false)} className={`flex items-center justify-center gap-1 rounded-md py-1.5 ${!c.bot_paused ? "bg-card shadow-card" : "text-muted-foreground"}`}><Bot className="h-3.5 w-3.5" /> البوت</button>
                  <button onClick={() => !c.bot_paused && togglePause(true)} className={`flex items-center justify-center gap-1 rounded-md py-1.5 ${c.bot_paused ? "bg-card shadow-card" : "text-muted-foreground"}`}><Headset className="h-3.5 w-3.5" /> الموظف</button>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <select value={c.assigned_to ?? ""} onChange={(e) => assign(e.target.value)} className="h-8 flex-1 rounded-md border bg-background px-2 text-xs">
                    <option value="">غير مسند</option>
                    {team.data?.map((t) => <option key={t.user_id} value={t.user_id}>{t.email?.split("@")[0]}</option>)}
                  </select>
                </label>
              </section>
            )}

            <section className="space-y-2 rounded-xl border bg-card p-3">
              <h3 className="flex items-center gap-1.5 text-sm font-bold"><StickyNote className="h-4 w-4 text-accent" /> ملاحظات داخلية</h3>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="خاصة بفريق العمل — لا تُرسل للعميل"
                className="w-full resize-none rounded-lg border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <button onClick={saveNote} disabled={!note.trim()} className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-40">حفظ</button>
            </section>

            <section className="space-y-2 rounded-xl border bg-card p-3">
              <h3 className="flex items-center gap-1.5 text-sm font-bold"><Package className="h-4 w-4 text-accent" /> المنظومة المختارة</h3>
              <div className="rounded-lg bg-muted px-3 py-2 text-sm">{c?.system || "—"}</div>
            </section>

            <section className="space-y-2 rounded-xl border bg-card p-3">
              <h3 className="flex items-center gap-1.5 text-sm font-bold"><FileText className="h-4 w-4 text-accent" /> الطلبات</h3>
              {orders.isLoading && <Skeleton className="h-8" />}
              {orders.data?.length === 0 && <p className="text-xs text-muted-foreground">لا توجد طلبات لهذا العميل</p>}
              {orders.data?.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg bg-muted px-2.5 py-1.5 text-xs">
                  <span dir="ltr" className="font-semibold">{o.invoice_no || "—"}</span>
                  <span className="text-muted-foreground">{o.method}</span>
                  <b className="tabular-nums">{o.amount || ""}</b>
                </div>
              ))}
            </section>
            {c?.created_at && <p className="text-center text-xs text-muted-foreground">عميل منذ {new Date(c.created_at).toLocaleDateString("ar")}</p>}
          </aside>
        </div>
      )}
    </div>
  );
}
