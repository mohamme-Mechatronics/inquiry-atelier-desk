import type { ComponentType, ReactNode } from "react";
import { Bot, FileText, Headset, StickyNote, User } from "lucide-react";
import { CHANNELS, channelOf, fmt } from "@/lib/crm";

type Icon = ComponentType<{ className?: string }>;

export function PageHeader({ title, description, count, actions }: {
  title: string; description?: string; count?: number; actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight md:text-2xl">
          {title}
          {count !== undefined && (
            <span className="rounded-md bg-muted px-2 py-0.5 font-sans text-sm font-semibold tabular-nums text-muted-foreground">{count}</span>
          )}
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, icon: I, action, children, className = "", bodyClass = "" }: {
  title?: string; icon?: Icon; action?: ReactNode; children: ReactNode; className?: string; bodyClass?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-xl border bg-card shadow-card ${className}`}>
      {title && (
        <header className="flex items-center gap-2 border-b px-4 py-3">
          {I && <I className="h-4 w-4 text-accent" />}
          <h2 className="font-sans text-sm font-bold">{title}</h2>
          {action && <div className="ms-auto">{action}</div>}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon: I, title, hint }: { icon: Icon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <I className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="font-semibold">{title}</p>
      {hint && <p className="max-w-xs text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ChannelBadge({ phone }: { phone: string }) {
  const ch = CHANNELS[channelOf(phone)];
  return <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-px text-[10px] font-semibold ${ch.cls}`}>{ch.label}</span>;
}

export function Avatar({ name, phone, size = "md" }: { name?: string | null | undefined; phone: string; size?: "sm" | "md" | "lg" }) {
  const ch = CHANNELS[channelOf(phone)];
  const s = size === "lg" ? "h-14 w-14 text-xl" : size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return (
    <div className={`relative flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary ${s}`}>
      {(name || "؟").trim().slice(0, 1)}
      <span className={`absolute bottom-0 end-0 h-3 w-3 rounded-full border-2 border-card ${ch.dot}`} />
    </div>
  );
}

export const selectCls =
  "h-8 rounded-md border bg-background px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

type Msg = { id: string; direction: string; kind: string; text: string | null; file_name: string | null; created_at: string };
const WHO: Record<string, { label: string; icon: Icon }> = {
  customer: { label: "العميل", icon: User },
  staff: { label: "الموظف", icon: Headset },
  note: { label: "ملاحظة داخلية", icon: StickyNote },
  bot: { label: "البوت", icon: Bot },
};

// Customer messages sit on the start side; bot/staff replies on the end side; notes centered.
export function MessageBubble({ m }: { m: Msg }) {
  const w = WHO[m.direction] ?? WHO["bot"]!;
  const tone =
    m.direction === "note" ? "mx-auto border border-dashed border-accent bg-accent/10"
    : m.direction === "customer" ? "me-auto rounded-ss-sm border bg-card"
    : m.direction === "staff" ? "ms-auto rounded-se-sm bg-primary text-primary-foreground"
    : "ms-auto rounded-se-sm bg-secondary text-secondary-foreground";
  return (
    <div className={`w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm shadow-card ${tone}`}>
      <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold opacity-70">
        <w.icon className="h-3 w-3" /> {w.label}
      </div>
      {m.kind === "document" && (
        <div className="mb-1 flex items-center gap-1.5 rounded-lg bg-background/60 px-2 py-1.5 text-xs font-semibold text-foreground">
          <FileText className="h-4 w-4 text-destructive" /> <span dir="ltr" className="truncate">{m.file_name}</span>
        </div>
      )}
      {m.text}
      <div className="mt-1 text-[10px] tabular-nums opacity-60">{fmt(m.created_at)}</div>
    </div>
  );
}
