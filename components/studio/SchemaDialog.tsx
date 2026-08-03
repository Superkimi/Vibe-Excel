"use client";

import { Check, Copy, DownloadSimple, X } from "@phosphor-icons/react";
import { useState } from "react";
import { useStudioI18n } from "@/components/studio/StudioI18n";
import type { WorkbookDocument } from "@/lib/workbook-schema";
import { downloadWorkbookJson } from "@/lib/excel-io";

interface SchemaDialogProps {
  document: WorkbookDocument;
  onClose: () => void;
}

export function SchemaDialog({ document, onClose }: SchemaDialogProps) {
  const { t } = useStudioI18n();
  const [copied, setCopied] = useState(false);
  const source = JSON.stringify(document, null, 2);
  const populatedCellCount = document.sheets.reduce(
    (total, sheet) => total + Object.keys(sheet.cells).length,
    0,
  );

  const copy = async () => {
    await navigator.clipboard.writeText(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="schema-dialog" role="dialog" aria-modal="true" aria-labelledby="schema-title">
        <header>
          <div><h2 id="schema-title">{t("schema.title")}</h2><p>{t("schema.description")}</p></div>
          <button className="icon-button" onClick={onClose} aria-label={t("schema.close")}><X /></button>
        </header>
        <pre>{source}</pre>
        <footer>
          <span>{t("schema.cells", { count: populatedCellCount })}</span>
          <div>
            <button className="button button-secondary" onClick={() => downloadWorkbookJson(document)}><DownloadSimple /> {t("schema.download")}</button>
            <button className="button button-primary" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? t("schema.copied") : t("schema.copy")}</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
