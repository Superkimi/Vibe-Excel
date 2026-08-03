"use client";

import { DownloadSimple, X } from "@phosphor-icons/react";
import { indexToColumn, parseCellAddress } from "@/lib/address";
import { useStudioI18n } from "@/components/studio/StudioI18n";
import type { WorkbookDocument } from "@/lib/workbook-schema";

interface PreviewDialogProps {
  document: WorkbookDocument;
  onClose: () => void;
  onExport: () => void;
}

function displayValue(value: string | number | boolean | null): string {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

export function PreviewDialog({ document, onClose, onExport }: PreviewDialogProps) {
  const { t } = useStudioI18n();
  const active = document.sheets.find((sheet) => sheet.id === document.activeSheetId) ?? document.sheets[0];
  const positions = Object.keys(active.cells).map(parseCellAddress);
  const maxRow = Math.min(40, Math.max(10, ...positions.map((position) => position.row + 1)));
  const maxColumn = Math.min(16, Math.max(6, ...positions.map((position) => position.column + 1)));

  return (
    <div className="preview-overlay">
      <header>
        <div><b>{document.title}</b><span>{t("preview.delivery", { sheet: active.name })}</span></div>
        <div>
          <button className="button button-secondary" onClick={onExport}><DownloadSimple /> {t("preview.export")}</button>
          <button className="icon-button" onClick={onClose} aria-label={t("preview.close")}><X /></button>
        </div>
      </header>
      <div className="preview-canvas">
        <div className="preview-paper">
          <div className="preview-table" style={{ gridTemplateColumns: `44px repeat(${maxColumn}, minmax(100px, 1fr))` }}>
            <span className="preview-corner" />
            {Array.from({ length: maxColumn }).map((_, column) => <span key={`col-${column}`} className="preview-header">{indexToColumn(column)}</span>)}
            {Array.from({ length: maxRow }).flatMap((_, row) => [
              <span key={`row-${row}`} className="preview-header">{row + 1}</span>,
              ...Array.from({ length: maxColumn }).map((__, column) => {
                const address = `${indexToColumn(column)}${row + 1}`;
                const cell = active.cells[address];
                return (
                  <span
                    key={address}
                    className="preview-cell"
                    style={{
                      background: cell?.style?.background,
                      color: cell?.style?.color,
                      fontWeight: cell?.style?.bold ? 700 : 400,
                      textAlign: cell?.style?.horizontalAlign,
                    }}
                    title={cell?.formula}
                  >
                    {cell?.formula && cell.value === null ? cell.formula : displayValue(cell?.value ?? null)}
                  </span>
                );
              }),
            ])}
          </div>
        </div>
      </div>
    </div>
  );
}
