import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const KEY = "tmk_admin_url";

/** Manual-only app update + switchable admin address (no auto update). */
export function AppSettings() {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(localStorage.getItem(KEY) || window.location.origin);
  }, []);

  async function update() {
    try {
      if ("caches" in window) for (const k of await caches.keys()) await caches.delete(k);
    } catch { /* ignore */ }
    const u = new URL(window.location.href);
    u.searchParams.set("v", String(Date.now()));
    window.location.replace(u.toString());
  }

  function save() {
    let u: URL;
    try { u = new URL(url.trim()); } catch { toast.error("الرابط غير صحيح"); return; }
    if (u.protocol !== "https:") { toast.error("يجب أن يبدأ الرابط بـ https://"); return; }
    localStorage.setItem(KEY, u.origin);
    window.location.href = u.origin + "/";
  }

  return (
    <section className="rounded-xl border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <Smartphone className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg font-bold">إعدادات التطبيق المحلي</h2>
      </div>
      <Button variant="outline" onClick={update}><Download className="h-4 w-4" /> تحديث التطبيق</Button>
      <p className="mt-1 text-xs text-muted-foreground">لا يتحدث التطبيق تلقائياً، اضغط الزر متى أردت آخر نسخة.</p>
      <label className="mt-5 block text-sm text-muted-foreground">عنوان خدمة الإدارة</label>
      <Input dir="ltr" className="mt-1.5" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
      <Button className="mt-4 bg-success text-success-foreground hover:bg-success/90" onClick={save}>حفظ وإعادة فتح التطبيق</Button>
    </section>
  );
}
