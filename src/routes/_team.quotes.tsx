import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmt } from "@/lib/crm";

export const Route = createFileRoute("/_team/quotes")({
  head: () => ({
    meta: [
      { title: "عروض الأسعار — تمكين" },
      { name: "description", content: "عروض الأسعار والدراسات والمخططات التي أرسلها البوت" },
      { property: "og:title", content: "عروض الأسعار — تمكين" },
      { property: "og:description", content: "عروض الأسعار والدراسات والمخططات التي أرسلها البوت" },
    ],
  }),
  component: Quotes,
});

function Quotes() {
  const { data = [] } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () =>
      (await supabase.from("messages").select("*").eq("kind", "document").order("created_at", { ascending: false }).limit(500)).data ?? [],
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">عروض الأسعار المرسلة</h1>
      <div className="divide-y rounded-xl bg-card shadow-sm">
        {data.length === 0 && <p className="p-6 text-center text-muted-foreground">لم يُرسل أي عرض بعد.</p>}
        {data.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-3 text-sm">
            <span className="text-xl">📄</span>
            <div className="flex-1">
              <b>{m.text || m.file_name}</b>
              <div className="text-xs text-muted-foreground">{m.file_name}</div>
            </div>
            <Link to="/customers/$phone" params={{ phone: m.phone }} dir="ltr" className="text-primary underline">+{m.phone}</Link>
            <span className="text-xs text-muted-foreground">{fmt(m.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
