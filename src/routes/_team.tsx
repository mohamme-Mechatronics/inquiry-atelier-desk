import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  LayoutGrid, BarChart3, MessageCircle, ShoppingCart, Users, FileText, FilePlus2, Wrench, Package, Settings, LogOut, Bell, Menu, ChevronLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LiveAlerts } from "@/components/LiveAlerts";
import logo from "@/assets/tamkeen-logo-clean.png.asset.json";

export const Route = createFileRoute("/_team")({ component: AppLayout });

type BadgeKey = "orders" | "tickets" | "human";
type NavItem = {
  to: "/" | "/stats" | "/chats" | "/orders" | "/customers" | "/quotes" | "/quote-builder" | "/tickets" | "/catalog" | "/team" | "/notifications";
  label: string;
  icon: typeof LayoutGrid;
  badge?: BadgeKey;
};
const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "العمليات",
    items: [
      { to: "/", label: "الرئيسية", icon: LayoutGrid },
      { to: "/chats", label: "المحادثات", icon: MessageCircle, badge: "human" },
      { to: "/orders", label: "الطلبات", icon: ShoppingCart, badge: "orders" },
      { to: "/quotes", label: "عروض الأسعار", icon: FileText },
      { to: "/quote-builder", label: "إنشاء عرض سعر", icon: FilePlus2 },
      { to: "/tickets", label: "الدعم الفني", icon: Wrench, badge: "tickets" },
      { to: "/catalog", label: "الأصناف", icon: Package },
    ],
  },
  {
    title: "الإدارة",
    items: [
      { to: "/notifications", label: "الإشعارات", icon: Bell },
      { to: "/stats", label: "الإحصائيات", icon: BarChart3 },
      { to: "/team", label: "الإعدادات والربط", icon: Settings },
    ],
  },
];
const ALL: NavItem[] = GROUPS.flatMap((g) => g.items);
const BOTTOM = ["/", "/chats", "/orders", "/tickets", "/catalog"] as const;

function useBadges(enabled: boolean) {
  return useQuery({
    queryKey: ["nav-badges"],
    enabled,
    refetchInterval: 30000,
    queryFn: async () => {
      const [o, t, h] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("customers").select("phone", { count: "exact", head: true }).eq("stage", "human"),
      ]);
      return { orders: o.count ?? 0, tickets: t.count ?? 0, human: h.count ?? 0 } as Record<BadgeKey, number>;
    },
  });
}

function Count({ n, className = "" }: { n?: number | undefined; className?: string }) {
  if (!n) return null;
  return (
    <span className={`min-w-5 rounded-full bg-accent px-1.5 text-center text-[10px] font-bold leading-5 tabular-nums text-accent-foreground ${className}`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

function AppLayout() {
  const { session, loading, isTeam, isAdmin } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [more, setMore] = useState(false);
  const badges = useBadges(!!session && isTeam);
  useEffect(() => {
    if (!loading && !session) nav({ to: "/login" });
  }, [loading, session, nav]);
  useEffect(() => {
    setMore(false);
  }, [pathname]);

  if (loading || !session)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <img src={logo.url} alt="تمكين" className="h-14 animate-pulse rounded-lg" />
        <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
      </div>
    );

  if (!isTeam)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-8 text-center shadow-elevated">
          <img src={logo.url} alt="تمكين" className="mx-auto w-40" />
          <h1 className="text-lg font-extrabold">حسابك بانتظار التفعيل</h1>
          <p className="text-sm text-muted-foreground">اطلب من المدير تفعيل حسابك من صفحة «الإعدادات والربط».</p>
          <Button variant="outline" className="w-full" onClick={() => supabase.auth.signOut()}>تسجيل الخروج</Button>
        </div>
      </div>
    );

  const email = session.user.email ?? "";
  const current = [...ALL].reverse().find((n) => (n.to === "/" ? pathname === "/" : pathname.startsWith(n.to)));
  const today = new Date().toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long" });
  const total = (badges.data?.orders ?? 0) + (badges.data?.tickets ?? 0) + (badges.data?.human ?? 0);

  const NavList = () => (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
      {GROUPS.map((g) => (
        <div key={g.title} className="space-y-1">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">{g.title}</p>
          {g.items.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
              className="group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              activeProps={{ className: "bg-sidebar-accent font-semibold !text-sidebar-foreground before:absolute before:inset-y-1.5 before:start-0 before:w-1 before:rounded-full before:bg-sidebar-primary" }}>
              <n.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{n.label}</span>
              {n.badge && <Count n={badges.data?.[n.badge]} />}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );

  const Brand = () => (
    <div className="flex items-center gap-3 px-1">
      <img src={logo.url} alt="تمكين" className="h-9 w-auto object-contain" />
      <div className="leading-tight">
        <div className="font-display text-base font-extrabold text-sidebar-foreground">تمكين</div>
        <div className="text-[11px] text-sidebar-foreground/60">منصة إدارة المبيعات</div>
      </div>
    </div>
  );

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring md:rounded-lg md:border md:py-1 md:pe-1 md:ps-3">
        <span className="hidden text-start leading-tight md:block">
          <span dir="ltr" className="block max-w-40 truncate text-xs font-semibold">{email}</span>
          <span className="block text-[10px] text-muted-foreground">{isAdmin ? "مدير النظام" : "موظف مبيعات"}</span>
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold uppercase text-primary-foreground">
          {email.slice(0, 1)}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span dir="ltr" className="block truncate text-sm font-semibold">{email}</span>
          <span className="text-xs text-muted-foreground">{isAdmin ? "مدير النظام" : "موظف مبيعات"}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem onClick={() => nav({ to: "/team" })}><Settings className="h-4 w-4" /> الإعدادات والربط</DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => supabase.auth.signOut()} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" /> تسجيل الخروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 bg-sidebar p-4 md:flex">
        <Brand />
        <NavList />
        <div className="rounded-xl bg-sidebar-accent/60 p-3 text-xs text-sidebar-foreground/70">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-sidebar-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> البوت متصل
          </div>
          واتساب وتليجرام يرسلان إلى هذه اللوحة مباشرة.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur md:h-16 md:px-6">
          <img src={logo.url} alt="تمكين" className="h-8 w-auto object-contain md:hidden" />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground max-md:hidden">
              تمكين <ChevronLeft className="h-3 w-3" /> {current?.label ?? "ملف العميل"}
            </div>
            <div className="truncate text-sm font-bold md:text-base">{current?.label ?? "ملف العميل"}</div>
          </div>
          <span className="hidden text-xs text-muted-foreground lg:block">{today}</span>
          <Link to="/notifications" aria-label="الإشعارات" className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
            <Bell className="h-5 w-5" />
            {total > 0 && <span className="absolute end-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-destructive" />}
          </Link>
          <UserMenu />
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-3 pb-20 md:p-6">
          <LiveAlerts />
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label="الأقسام الرئيسية" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {BOTTOM.map((to) => {
          const n = ALL.find((x) => x.to === to);
          if (!n) return null;
          return (
            <Link key={to} to={to} activeOptions={{ exact: to === "/" }}
              className="relative flex flex-col items-center gap-0.5 py-2 text-[10px] text-muted-foreground"
              activeProps={{ className: "!text-primary font-bold" }}>
              <n.icon className="h-5 w-5" />
              {n.label}
              {n.badge && <Count n={badges.data?.[n.badge]} className="absolute top-1 start-1/2 ms-2" />}
            </Link>
          );
        })}
        <Button variant="ghost" onClick={() => setMore(true)} className="h-auto flex-col gap-0.5 rounded-none px-0 py-2 text-[10px] font-normal text-muted-foreground">
          <Menu className="h-5 w-5" /> المزيد
        </Button>
      </nav>

      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="right" className="flex w-72 flex-col gap-6 border-0 bg-sidebar p-4 text-sidebar-foreground">
          <SheetTitle className="sr-only">القائمة</SheetTitle>
          <Brand />
          <NavList />
          <button onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" /> تسجيل الخروج
          </button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
