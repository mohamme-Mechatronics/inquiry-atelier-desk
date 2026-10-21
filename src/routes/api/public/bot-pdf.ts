import { createFileRoute } from "@tanstack/react-router";

// Drop-in replacement for Gotenberg's /forms/chromium/convert/html used by the n8n bot.
// Accepts the same multipart fields and renders with headless Chromium (Browserless).
export const Route = createFileRoute("/api/public/bot-pdf")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["BOT_SECRET"];
        if (!secret || request.headers.get("x-bot-secret") !== secret) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        const token = process.env["BROWSERLESS_TOKEN"];
        if (!token) return Response.json({ error: "pdf service not configured" }, { status: 500 });

        const form = await request.formData();
        let html = "";
        let footer = "";
        for (const f of form.getAll("files")) {
          if (typeof f === "string") continue;
          const name = (f as File).name || "";
          const text = await (f as File).text();
          if (name === "footer.html") footer = text;
          else if (name === "index.html" || !html) html = text;
        }
        if (!html) return Response.json({ error: "missing index.html" }, { status: 400 });

        const flag = (k: string, d: boolean) => {
          const v = form.get(k);
          return v == null ? d : String(v) === "true";
        };
        const mb = form.get("marginBottom");
        const options: Record<string, unknown> = {
          printBackground: flag("printBackground", true),
          preferCSSPageSize: flag("preferCssPageSize", true),
        };
        if (!form.get("paperWidth")) options.format = "A4";
        if (footer) {
          options.displayHeaderFooter = true;
          options.headerTemplate = "<span></span>";
          options.footerTemplate = footer;
          options.margin = { bottom: mb ? String(mb) : "0.55in" };
        } else if (mb) {
          options.margin = { bottom: String(mb) };
        }

        const res = await fetch(
          `https://production-sfo.browserless.io/pdf?token=${encodeURIComponent(token)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              html,
              options,
              gotoOptions: { waitUntil: "networkidle0", timeout: 60000 },
            }),
          },
        );
        if (!res.ok) {
          const t = await res.text();
          return Response.json({ error: "pdf failed", status: res.status, detail: t.slice(0, 500) }, { status: 502 });
        }
        const name = (request.headers.get("gotenberg-output-filename") || "document").replace(/[^\w .-]/g, "") || "document";
        return new Response(res.body, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${name}.pdf"`,
          },
        });
      },
    },
  },
});
