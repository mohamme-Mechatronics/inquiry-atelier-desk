import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle, ShieldCheck, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/tamkeen-logo-clean.png.asset.json";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — تمكين" },
      { name: "description", content: "دخول فريق المبيعات إلى لوحة تمكين" },
      { property: "og:title", content: "تسجيل الدخول — تمكين" },
      { property: "og:description", content: "دخول فريق المبيعات إلى لوحة تمكين" },
    ],
  }),
  component: Login,
});

const FEATURES = [
  { icon: MessageCircle, t: "محادثات واتساب وتليجرام في صندوق واحد" },
  { icon: BarChart3, t: "متابعة الطلبات والعملاء لحظة بلحظة" },
  { icon: ShieldCheck, t: "صلاحيات منفصلة للمدير والموظفين" },
];

function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error("البريد أو كلمة السر غير صحيحة"); return; }
      nav({ to: "/" });
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("تم إنشاء الحساب. افتح بريدك لتأكيد الحساب ثم سجّل الدخول.");
      setMode("in");
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col">
        <div className="absolute -end-24 -top-24 h-96 w-96 rounded-full bg-sidebar-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -start-16 h-80 w-80 rounded-full bg-sidebar-accent blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="rounded-xl bg-card p-1.5"><img src={logo.url} alt="تمكين" className="h-12 w-12 object-contain" /></div>
          <div>
            <div className="font-display text-xl font-extrabold">تمكين</div>
            <div className="text-xs text-sidebar-foreground/60">للحلول التقنية الذكية</div>
          </div>
        </div>
        <div className="relative mt-auto max-w-md space-y-8">
          <h2 className="text-4xl font-extrabold leading-tight">منصة إدارة المبيعات<br /><span className="text-sidebar-primary">لفريق تمكين</span></h2>
          <ul className="space-y-4">
            {FEATURES.map((f) => (
              <li key={f.t} className="flex items-center gap-3 text-sm text-sidebar-foreground/85">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent"><f.icon className="h-4 w-4 text-sidebar-primary" /></span>
                {f.t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-12 text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} تمكين للحلول التقنية الذكية</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center lg:text-start">
            <img src={logo.url} alt="تمكين للحلول التقنية الذكية" className="mx-auto w-40 lg:hidden" />
            <h1 className="text-2xl font-extrabold">{mode === "in" ? "تسجيل الدخول" : "إنشاء حساب موظف"}</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "in" ? "أدخل بيانات حسابك للوصول إلى لوحة الإدارة" : "بعد إنشاء الحساب يفعّله المدير من الإعدادات"}
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" type="email" dir="ltr" required autoComplete="email" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">كلمة السر</Label>
              <Input id="pw" type="password" dir="ltr" required minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"} className="h-11" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <Button className="h-11 w-full text-base" disabled={busy}>
            {busy ? "جارٍ التحقق…" : mode === "in" ? "دخول" : "إنشاء الحساب"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "in" ? "موظف جديد؟ " : "لديك حساب؟ "}
            <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "أنشئ حساباً" : "سجّل الدخول"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
