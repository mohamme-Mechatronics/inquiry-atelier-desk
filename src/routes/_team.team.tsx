import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_team/team")({
  head: () => ({
    meta: [
      { title: "الفريق — تمكين" },
      { name: "description", content: "تفعيل حسابات موظفي المبيعات" },
      { property: "og:title", content: "الفريق — تمكين" },
      { property: "og:description", content: "تفعيل حسابات موظفي المبيعات" },
    ],
  }),
  component: Team,
});

function Team() {
  const { isAdmin, session } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const [m, r] = await Promise.all([
        supabase.from("team_members").select("*").order("created_at"),
        supabase.from("user_roles").select("*"),
      ]);
      return { members: m.data ?? [], roles: r.data ?? [] };
    },
  });
  if (!isAdmin) return <p className="text-muted-foreground">هذه الصفحة للمدير فقط.</p>;
  const roleOf = (id: string) => data?.roles.filter((r) => r.user_id === id).map((r) => r.role) ?? [];
  const setRole = async (user_id: string, role: "staff" | "admin" | null) => {
    await supabase.from("user_roles").delete().eq("user_id", user_id);
    if (role) {
      const { error } = await supabase.from("user_roles").insert({ user_id, role });
      if (error) { toast.error("تعذر الحفظ"); return; }
    }
    toast.success("تم التحديث");
    qc.invalidateQueries({ queryKey: ["team"] });
  };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">الإعدادات والربط مع البوت</h1>
      <div className="space-y-2 rounded-xl bg-card p-4 text-sm shadow-sm">
        <h2 className="font-bold text-primary">القنوات المربوطة</h2>
        <p>• <b>واتساب</b> و<b>تليجرام</b> (@LithiumPowerBot) يرسلان كل الرسائل والطلبات إلى هذه اللوحة تلقائياً عبر n8n.</p>
        <p>• الرد من صفحة «المحادثات» يصل للعميل على نفس القناة التي راسل منها.</p>
        <p className="text-muted-foreground">رابط الاستقبال: <span dir="ltr">{typeof window !== "undefined" ? window.location.origin : ""}/api/public/bot-message</span></p>
      </div>
      <h2 className="text-lg font-extrabold">فريق العمل</h2>
      <p className="text-sm text-muted-foreground">كل موظف ينشئ حساباً من صفحة الدخول، ثم تفعّله أنت هنا.</p>
      <div className="divide-y rounded-xl bg-card shadow-sm">
        {data?.members.map((m) => {
          const r = roleOf(m.user_id);
          const me = m.user_id === session?.user.id;
          return (
            <div key={m.user_id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
              <span dir="ltr" className="flex-1">{m.email}</span>
              <span className="rounded bg-muted px-2">{r.includes("admin") ? "مدير" : r.includes("staff") ? "موظف" : "بانتظار التفعيل"}</span>
              {!me && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setRole(m.user_id, "staff")}>موظف</Button>
                  <Button size="sm" variant="outline" onClick={() => setRole(m.user_id, "admin")}>مدير</Button>
                  <Button size="sm" variant="ghost" onClick={() => setRole(m.user_id, null)}>إيقاف</Button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
