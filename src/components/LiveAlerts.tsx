import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Short two-tone chime generated in the browser (no audio file needed).
function chime(ctx: AudioContext) {
  const now = ctx.currentTime;
  [880, 1320].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    o.type = "sine";
    g.gain.setValueAtTime(0.0001, now + i * 0.18);
    g.gain.exponentialRampToValueAtTime(0.35, now + i * 0.18 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.35);
    o.connect(g).connect(ctx.destination);
    o.start(now + i * 0.18);
    o.stop(now + i * 0.18 + 0.4);
  });
}

export function LiveAlerts() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const ctx = useRef<AudioContext | null>(null);

  useEffect(() => {
    const unlock = () => {
      if (!ctx.current) ctx.current = new AudioContext();
      if (ctx.current.state === "suspended") void ctx.current.resume();
    };
    window.addEventListener("pointerdown", unlock);

    const alert = (title: string, body: string, phone?: string) => {
      if (localStorage.getItem("tmk-sound") !== "off" && ctx.current) chime(ctx.current);
      navigator.vibrate?.([120, 60, 120]);
      toast(title, {
        description: body.slice(0, 120),
        action: phone ? { label: "فتح", onClick: () => nav({ to: "/chats", search: { p: phone } }) } : undefined,
      });
      if (document.hidden && "Notification" in window && Notification.permission === "granted") {
        try { new Notification(title, { body: body.slice(0, 120), icon: "/icon-192.png" }); } catch { /* ignore */ }
      }
      qc.invalidateQueries();
    };

    const channel = supabase
      .channel("live-alerts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p: any) => {
        const m = p.new;
        if (m.direction !== "customer") return;
        alert("رسالة جديدة", m.text || (m.kind === "image" ? "📷 صورة" : "📎 ملف"), m.phone);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (p: any) => {
        alert("🛒 طلب شراء جديد", `${p.new.name || p.new.phone} ${p.new.amount || ""}`, p.new.phone);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tickets" }, (p: any) => {
        alert("🔧 بلاغ صيانة جديد", `${p.new.ticket_no} — ${p.new.name || p.new.phone}`, p.new.phone);
      })
      .subscribe();

    return () => {
      window.removeEventListener("pointerdown", unlock);
      supabase.removeChannel(channel);
    };
  }, [qc, nav]);

  return null;
}
