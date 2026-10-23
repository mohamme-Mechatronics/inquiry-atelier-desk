import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ChannelBadge, EmptyState, PageHeader, Panel, Skeleton } from "@/components/admin";
import { fmt } from "@/lib/crm";

export const Route = createFileRoute("/_team/quotes")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "عروض الأسعار — تمكين" },
      { name: "description", content: "عروض الأسعار والدراسات والمخططات التي أرسلها البوت" },
      { property: "og:title", content: "عروض الأسعار — تمكين" },
      { property: "og:description", content: "عروض الأسعار والدراسات والمخططات التي أرسلها البوت" },
    ],
  }),
  component: Quotes,
});

function Quotes() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () =>
      (await supabase.from("messages").select("*").eq("kind", "document").order("created_at", { ascending: false }).limit(500)).data ?? [],
  });
  return (
    <div className="space-y-4">
      <PageHeader title="عروض الأسعار والملفات" count={data.length} actions={<Button asChild size="sm" className="gap-1 text-xs"><Link to="/quote-builder"><FilePlus2 className="h-4 w-4" />إنشاء عرض سعر</Link></Button>} />
      <Panel>
        <div className="hidden grid-cols-[2fr_1fr_9rem] gap-3 border-b bg-muted/50 px-4 py-2 text-[11px] font-semibold text-muted-foreground md:grid">
          <span>الملف</span><span>العميل</span><span className="text-end">التاريخ</span>
        </div>
        {isLoading && <div className="space-y-3 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>}
        {!isLoading && data.length === 0 && <EmptyState icon={FileText} title="لم يُرسل أي ملف بعد" hint="ستظهر هنا عروض الأسعار والدراسات فور إرسالها من البوت." />}
        <ul className="divide-y">
          {data.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 md:grid md:grid-cols-[2fr_1fr_9rem]">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"><FileText className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{m.text || m.file_name}</div>
                  <div dir="ltr" className="truncate text-end text-xs text-muted-foreground">{m.file_name}</div>
                </div>
              </div>
              <Link to="/customers/$phone" params={{ phone: m.phone }} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                <ChannelBadge phone={m.phone} /><span dir="ltr" className="tabular-nums">{m.phone}</span>
              </Link>
              <span className="text-xs tabular-nums text-muted-foreground md:text-end">{fmt(m.created_at)}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
