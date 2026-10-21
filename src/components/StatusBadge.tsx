import { STATUSES } from "@/lib/crm";

export function StatusBadge({ status }: { status: string }) {
  const s = STATUSES[status] ?? STATUSES["new"]!;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}
