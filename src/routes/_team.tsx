import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BarChart3, Users, ShoppingCart, FileText, Wrench, Package, UserCog, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import logo from "@/assets/tamkeen-logo.png.asset.json";

export const Route = createFileRoute("/_team")({ component: AppLayout });

const NAV = [
  { to: "/", label: "التقارير", icon: BarChart3 },
  { to: "/customers", label: "العملاء", icon: Users },
  { to: "/orders", label: "الطلبات", icon: ShoppingCart },
  { to: "/quotes", label: "عروض الأسعار", icon: FileText },
  { to: "/tickets", label: "الدعم الفني", icon: Wrench },
  { to: "/catalog", label: "الأصناف", icon: Package },
  { to: "/team", label: "الفريق", icon: UserCog },
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
        <p className="max-w-sm">حسابك بانتظار موافقة المدير. اطلب منه تفعيلك من صفحة «الفريق».</p>
        <Button variant="outline" onClick={() => supabase.auth.signOut()}>خروج</Button>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-sidebar text-sidebar-foreground shadow">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
          <div className="rounded-lg bg-card px-2 py-1">
            <img src={logo.url} alt="تمكين" className="h-9" />
          </div>
          <span className="hidden font-bold sm:inline">إدارة المبيعات</span>
          <button
            className="ms-auto flex items-center gap-1 text-sm opacity-80 hover:opacity-100"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="h-4 w-4" /> خروج
          </button>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 pb-2">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground font-semibold" }}
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
