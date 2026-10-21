import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Bot, MessageCircle, Search, Send, StickyNote, Headset, Zap, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar, ChannelBadge, EmptyState, MessageBubble, Skeleton } from "@/components/admin";
import { QUICK_REPLIES, channelOf, ago, preview } from "@/lib/crm";
import { sendReply } from "@/lib/reply.functions";

type Search = { p?: string };

export const Route = createFileRoute("/_team/chats")({
  validateSearch: (s: Record<string, unknown>): Search => (typeof s["p"] === "string" ? { p: s["p"] as string } : {}),
  head: () => ({
    meta: [
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
  const [f, setF] = useState<"all" | "unread" | "paused" | "whatsapp" | "telegram">("all");
  const [seen, setSeen] = useState<Record<string, string>>({});
  useEffect(() => setSeen(readSeen()), []);

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
    ["all", "الكل"], ["unread", "غير مقروءة"], ["paused", "رد يدوي"], ["whatsapp", "واتساب"], ["telegram", "تليجرام"],
  ] as const;

  return (
    <div className="grid h-[calc(100dvh-9.25rem)] overflow-hidden rounded-xl border bg-card shadow-card md:h-[calc(100dvh-7rem)] md:grid-cols-[22rem_1fr]">
      <div className={`flex min-h-0 flex-col border-e ${p ? "hidden md:flex" : "flex"}`}>
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
      <div className={`min-h-0 ${p ? "flex" : "hidden md:flex"} flex-col`}>
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
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const ch = channelOf(phone);

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
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [count, phone]);

  const togglePause = async (v: boolean) => {
    const { error } = await supabase.from("customers").update({ bot_paused: v }).eq("phone", phone);
    if (error) { toast.error("تعذر الحفظ"); return; }
    toast.success(v ? "تم إيقاف البوت لهذا العميل" : "تم تشغيل البوت");
    qc.invalidateQueries({ queryKey: ["chat", phone] });
    qc.invalidateQueries({ queryKey: ["customers"] });
  };

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try {
      if (mode === "note") {
        const { error } = await supabase.from("messages").insert({ phone, direction: "note", kind: "note", text: t });
        if (error) throw new Error("تعذر حفظ الملاحظة");
      } else {
        await reply({ data: { phone, text: t } });
      }
      setText("");
      qc.invalidateQueries({ queryKey: ["chat", phone] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    } catch (e: any) {
      toast.error(e?.message || "تعذر الإرسال");
    } finally {
      setBusy(false);
    }
  };

  const c = data?.c;
  const msgs = useMemo(() => data?.msgs ?? [], [data]);

  return (
    <>
      <div className="flex items-center gap-3 border-b px-3 py-2.5">
        <button onClick={onBack} className="rounded-md p-1 hover:bg-muted md:hidden" aria-label="رجوع"><ArrowRight className="h-5 w-5" /></button>
        <Avatar name={c?.name} phone={phone} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-bold">{c?.name || phone}</span>
            {c && <StatusBadge status={c.status} />}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ChannelBadge phone={phone} />
            <span dir="ltr" className="tabular-nums">{ch === "whatsapp" ? `+${phone}` : `ID ${phone}`}</span>
          </div>
        </div>
        {c && (
          <label className={`hidden items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium sm:flex ${c.bot_paused ? "border-warning/40 bg-warning/10" : ""}`}>
            {c.bot_paused ? <Headset className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            {c.bot_paused ? "رد يدوي" : "البوت يعمل"}
            <Switch checked={c.bot_paused} onCheckedChange={togglePause} />
          </label>
        )}
        <Link to="/customers/$phone" params={{ phone }} aria-label="ملف العميل"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
      {c && (
        <label className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5 text-xs sm:hidden">
          {c.bot_paused ? "البوت موقوف — الرد يدوي" : "البوت يرد تلقائياً"}
          <Switch checked={c.bot_paused} onCheckedChange={togglePause} />
        </label>
      )}

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-muted/40 p-4">
        {!data && [1, 2, 3].map((i) => <Skeleton key={i} className={`h-14 w-2/3 ${i % 2 ? "" : "ms-auto"}`} />)}
        {data && msgs.length === 0 && <EmptyState icon={MessageCircle} title="لا توجد رسائل بعد" />}
        {msgs.map((m) => <MessageBubble key={m.id} m={m} />)}
        <div ref={end} />
      </div>

      <div className={`space-y-2 border-t p-3 ${mode === "note" ? "bg-accent/5" : ""}`}>
        <div className="flex items-center gap-1">
          <div className="flex rounded-lg bg-muted p-0.5">
            <button onClick={() => setMode("reply")} className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium ${mode === "reply" ? "bg-card shadow-card" : "text-muted-foreground"}`}>
              <Send className="h-3 w-3" /> رد للعميل
            </button>
            <button onClick={() => setMode("note")} className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium ${mode === "note" ? "bg-card shadow-card" : "text-muted-foreground"}`}>
              <StickyNote className="h-3 w-3" /> ملاحظة داخلية
            </button>
          </div>
        </div>
        {mode === "reply" && (
          <div className="scrollbar-none flex gap-1 overflow-x-auto">
            {QUICK_REPLIES.map((r) => (
              <button key={r.label} onClick={() => setText(r.text)}
                className="flex shrink-0 items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:border-accent hover:text-foreground">
                <Zap className="h-3 w-3 text-accent" /> {r.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder={mode === "reply" ? "اكتب رداً للعميل… (Enter للإرسال)" : "ملاحظة لا يراها العميل…"}
            className="min-h-11 flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <button onClick={submit} disabled={busy || !text.trim()} aria-label="إرسال"
            className={`flex h-11 w-11 items-center justify-center rounded-xl disabled:opacity-40 ${mode === "note" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}>
            <Send className="h-4 w-4 -scale-x-100" />
          </button>
        </div>
      </div>
    </>
  );
}
