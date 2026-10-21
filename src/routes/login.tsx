import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/tamkeen-logo.png.asset.json";

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
    <div className="flex min-h-screen items-center justify-center bg-primary px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-6 shadow-xl">
        <img src={logo.url} alt="تمكين للحلول التقنية الذكية" className="mx-auto w-56" />
        <h1 className="text-center text-xl font-bold">
          {mode === "in" ? "دخول إدارة المبيعات" : "حساب جديد لفريق المبيعات"}
        </h1>
        <div className="space-y-1.5">
          <Label>البريد الإلكتروني</Label>
          <Input type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>كلمة السر</Label>
          <Input type="password" dir="ltr" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button className="w-full" disabled={busy}>
          {mode === "in" ? "دخول" : "إنشاء حساب"}
        </Button>
        <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "ليس لديك حساب؟ أنشئ حساباً" : "لديك حساب؟ سجّل الدخول"}
        </button>
      </form>
    </div>
  );
}
