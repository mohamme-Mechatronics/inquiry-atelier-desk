import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportCsv, exportPdf, type Table } from "@/lib/export";
import logo from "@/assets/tamkeen-logo-clean.png.asset.json";

export function ExportButtons({ table }: { table: () => Table }) {
  const empty = table().rows.length === 0;
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" disabled={empty} onClick={() => exportCsv(table())}>
        <FileSpreadsheet className="h-4 w-4" /> CSV
      </Button>
      <Button variant="outline" size="sm" disabled={empty} onClick={() => exportPdf(table(), logo.url)}>
        <FileText className="h-4 w-4" /> PDF
      </Button>
    </div>
  );
}
