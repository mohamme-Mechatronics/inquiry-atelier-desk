import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutGrid, MessageCircle, ShoppingCart, Users, FileText, Wrench, Package, Settings, LogOut, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import logo from "@/assets/tamkeen-logo.png.asset.json";

export const Route = createFileRoute("/_team")({ component: AppLayout });

const NAV = [
  { to: "/", label: "الرئيسية", icon: LayoutGrid },
  { to: "/chats", label: "المحادثات", icon: MessageCircle },
  { to: "/orders", label: "الطلبات", icon: ShoppingCart },
  { to: "/customers", label: "العملاء", icon: Users },
  { to: "/quotes", label: "عروض الأسعار", icon: FileText },
  { to: "/tickets", label: "الدعم الفني", icon: Wrench },
  { to: "/catalog", label: "الأصناف", icon: Package },
  { to: "/team", label: "الإعدادات", icon: Settings },
] as const;

function AppLayout() {
  const { session, loading, isTeam } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && !session) nav({ to: "/login" });
  }, [loading, session, nav]);

  if (loading || !session) return <div className="p-10 text-center text-muted-foreground">جارٍ التحميل…</div>;

  if (!isTeam)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <img src={logo.url} alt="تمكين" className="w-48" />
        <p className="max-w-sm">حسابك بانتظار موافقة المدير. اطلب منه تفعيلك من صفحة «الإعدادات».</p>
        <Button variant="outline" onClick={() => supabase.auth.signOut()}>خروج</Button>
      </div>
    );

  const link = "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted";
  const active = { className: "bg-secondary font-bold text-foreground" };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-e bg-card p-3 md:flex">
        <div className="mb-4 flex items-center gap-2 px-1">
          <img src={logo.url} alt="تمكين" className="h-10" />
          <div>
            <div className="font-extrabold text-primary">تمكين</div>
            <div className="text-[11px] text-muted-foreground">لوحة الإدارة</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }} className={link} activeProps={active}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <button className={link} onClick={() => supabase.auth.signOut()}>
          <LogOut className="h-4 w-4" /> خروج
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b bg-card">
          <div className="flex items-center gap-2 px-4 py-2">
            <img src={logo.url} alt="تمكين" className="h-8 md:hidden" />
            <span className="font-bold md:hidden">لوحة الإدارة</span>
            <Link to="/" className="ms-auto text-primary" aria-label="الإشعارات"><Bell className="h-5 w-5" /></Link>
            <button className="text-muted-foreground md:hidden" onClick={() => supabase.auth.signOut()} aria-label="خروج">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:hidden">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }} className={link} activeProps={active}>
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
