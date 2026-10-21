import { STATUSES } from "@/lib/crm";

export function StatusBadge({ status }: { status: string }) {
  const s = STATUSES[status] ?? STATUSES.new;
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}
