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
        // When this site's PDF key is missing or rejected, hand the same request to the
        // backup PDF site (PDF_FALLBACK_URL) so quotes keep working. The header stops loops.
        const backup = request.headers.get("x-pdf-fallback") ? null : request.clone();
        const fallback = async (why: Response) => {
          const url = process.env["PDF_FALLBACK_URL"];
          if (!backup || !url) return why;
          const headers = new Headers(backup.headers);
          headers.set("x-pdf-fallback", "1");
          headers.delete("host");
          headers.delete("content-length");
          const r = await fetch(url, { method: "POST", headers, body: await backup.arrayBuffer() });
          return r.ok ? new Response(r.body, { headers: r.headers }) : why;
        };

        const token = process.env["BROWSERLESS_TOKEN"];
        if (!token) return fallback(Response.json({ error: "pdf service not configured" }, { status: 500 }));

        // A non-multipart or truncated body makes formData() throw; answer 400 instead of crashing.
        let form: FormData;
        try {
          form = await request.formData();
        } catch (error) {
          console.error(error);
          return Response.json(
            { error: "expected multipart/form-data with an index.html file" },
            { status: 400 },
          );
        }
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
        const options: {
          printBackground: boolean;
          preferCSSPageSize: boolean;
          format?: string;
          displayHeaderFooter?: boolean;
          headerTemplate?: string;
          footerTemplate?: string;
          margin?: { bottom: string };
        } = {
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

        let res: Response;
        try {
          res = await fetch(
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
        } catch (error) {
          console.error(error);
          return fallback(Response.json({ error: "pdf service unreachable" }, { status: 502 }));
        }
        if (!res.ok) {
          const t = await res.text();
          return fallback(Response.json({ error: "pdf failed", status: res.status, detail: t.slice(0, 500) }, { status: 502 }));
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
