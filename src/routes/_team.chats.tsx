import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Bot, MessageCircle, Search, Send, StickyNote, User, Headset } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/StatusBadge";
import { CHANNELS, QUICK_REPLIES, channelOf, fmt } from "@/lib/crm";
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

  const { data: list = [] } = useQuery({
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
    ["all", "الكل"], ["unread", "غير المقروءة"], ["paused", "البوت متوقف"], ["whatsapp", "واتساب"], ["telegram", "تليجرام"],
  ] as const;

  return (
    <div className="grid h-[calc(100vh-8rem)] overflow-hidden rounded-xl border bg-card md:grid-cols-[20rem_1fr]">
      <div className={`flex min-h-0 flex-col border-e ${p ? "hidden md:flex" : "flex"}`}>
        <div className="space-y-2 border-b p-3">
          <div className="relative">
            <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الرقم"
              className="w-full rounded-full bg-muted py-2 pe-3 ps-9 text-sm outline-none" />
          </div>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map(([k, l]) => (
              <button key={k} onClick={() => setF(k)}
                className={`rounded-full px-2.5 py-0.5 text-xs ${f === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {shown.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">لا توجد محادثات</p>}
          {shown.map((c) => {
            const ch = CHANNELS[channelOf(c.phone)];
            return (
              <button key={c.phone} onClick={() => open(c.phone, c.last_at)}
                className={`flex w-full items-center gap-3 border-b p-3 text-start hover:bg-muted ${p === c.phone ? "bg-secondary" : ""}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold ${ch.cls}`}>
                  {(c.name || "؟").slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-sm font-bold">{c.name || c.phone}</span>
                    {c.bot_paused ? <Headset className="h-3.5 w-3.5 text-destructive" /> : <Bot className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="ms-auto shrink-0 text-[10px] text-muted-foreground">{fmt(c.last_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`shrink-0 rounded px-1 text-[10px] ${ch.cls}`}>{ch.label}</span>
                    <span className="truncate text-xs text-muted-foreground">{c.last_message}</span>
                    {unread(c) && <span className="ms-auto h-2 w-2 shrink-0 rounded-full bg-accent" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className={`min-h-0 ${p ? "flex" : "hidden md:flex"} flex-col`}>
        {p ? <Conversation phone={p} onBack={() => nav({ search: {} })} /> : (
          <div className="m-auto flex flex-col items-center gap-2 text-muted-foreground">
            <MessageCircle className="h-10 w-10 text-primary" /> اختر محادثة لعرضها
          </div>
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
  const who = (d: string) => (d === "customer" ? "العميل" : d === "staff" ? "الموظف" : d === "note" ? "ملاحظة داخلية" : "البوت");

  return (
    <>
      <div className="flex items-center gap-2 border-b p-3">
        <button onClick={onBack} className="md:hidden" aria-label="رجوع"><ArrowRight className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link to="/customers/$phone" params={{ phone }} className="truncate font-bold hover:underline">{c?.name || phone}</Link>
            <span className={`rounded px-1.5 text-[10px] ${CHANNELS[ch].cls}`}>{CHANNELS[ch].label}</span>
            {c && <StatusBadge status={c.status} />}
          </div>
          <div dir="ltr" className="text-end text-xs text-muted-foreground">{ch === "whatsapp" ? `+${phone}` : `Telegram ID ${phone}`}</div>
        </div>
        {c && (
          <label className="flex items-center gap-1.5 text-xs">
            إيقاف البوت
            <Switch checked={c.bot_paused} onCheckedChange={togglePause} />
          </label>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-muted/40 p-3">
        {msgs.map((m) => {
          const mine = m.direction !== "customer";
          const note = m.direction === "note";
          return (
            <div key={m.id}
              className={`max-w-[85%] whitespace-pre-wrap rounded-xl p-2 text-sm shadow-sm ${
                note ? "mx-auto border border-dashed border-accent bg-secondary" : mine ? "me-auto bg-card" : "ms-auto bg-primary text-primary-foreground"
              }`}>
              <div className="mb-0.5 flex items-center gap-1 text-[10px] opacity-70">
                {m.direction === "customer" ? <User className="h-3 w-3" /> : note ? <StickyNote className="h-3 w-3" /> : m.direction === "staff" ? <Headset className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                {who(m.direction)}
              </div>
              {m.kind === "document" && <b className="block">📄 {m.file_name}</b>}
              {m.text}
              <div className="mt-1 text-[10px] opacity-60">{fmt(m.created_at)}</div>
            </div>
          );
        })}
        <div ref={end} />
      </div>

      <div className="space-y-2 border-t p-3">
        <div className="flex gap-1">
          <button onClick={() => setMode("reply")} className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs ${mode === "reply" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            <Send className="h-3 w-3" /> رد للعميل
          </button>
          <button onClick={() => setMode("note")} className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs ${mode === "note" ? "bg-accent text-accent-foreground" : "bg-muted"}`}>
            <StickyNote className="h-3 w-3" /> ملاحظة داخلية
          </button>
        </div>
        {mode === "reply" && (
          <div className="flex gap-1 overflow-x-auto pb-1">
            {QUICK_REPLIES.map((r) => (
              <button key={r.label} onClick={() => setText(r.text)} className="shrink-0 rounded-full border px-2.5 py-0.5 text-xs hover:bg-muted">
                ⚡ {r.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder={mode === "reply" ? "اكتب رداً للعميل…" : "ملاحظة لا يراها العميل…"}
            className="min-h-10 flex-1 resize-none rounded-xl border bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={submit} disabled={busy || !text.trim()} aria-label="إرسال"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
