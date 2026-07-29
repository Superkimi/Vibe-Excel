"use client";

import { Check, Copy, DownloadSimple, X } from "@phosphor-icons/react";
import { useState } from "react";
import type { WorkbookDocument } from "@/lib/workbook-schema";
import { downloadWorkbookJson } from "@/lib/excel-io";

interface SchemaDialogProps {
  document: WorkbookDocument;
  onClose: () => void;
}

export function SchemaDialog({ document, onClose }: SchemaDialogProps) {
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
          <div><h2 id="schema-title">工作簿 Schema</h2><p>`vibe-excel/1` 是编辑器、AI 与导出器共享的模型。</p></div>
          <button className="icon-button" onClick={onClose} aria-label="关闭"><X /></button>
        </header>
        <pre>{source}</pre>
        <footer>
          <span>{populatedCellCount} 个有效单元格</span>
          <div>
            <button className="button button-secondary" onClick={() => downloadWorkbookJson(document)}><DownloadSimple /> 下载 JSON</button>
            <button className="button button-primary" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? "已复制" : "复制代码"}</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
