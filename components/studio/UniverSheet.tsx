"use client";

import { useEffect, useRef } from "react";
import { LocaleType, createUniver, mergeLocales, type FUniver, type IWorkbookData } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import zhCN from "@univerjs/preset-sheets-core/locales/zh-CN";
import "@univerjs/preset-sheets-core/lib/index.css";
import type { WorkbookDocument } from "@/lib/workbook-schema";
import {
  mergeUniverSnapshotIntoWorkbook,
  workbookToUniverSnapshot,
  type UniverWorkbookSnapshot,
} from "@/lib/univer-adapter";

interface UniverSheetProps {
  document: WorkbookDocument;
  onDocumentChange: (document: WorkbookDocument) => void;
  onApiReady: (api: FUniver | null) => void;
}

const ignoredCommands = new Set([
  "univer.operation.set-unit",
  "sheet.operation.set-selections",
  "sheet.operation.set-activate-cell",
  "sheet.operation.set-scroll",
  "sheet.operation.set-zoom-ratio",
]);

export function UniverSheet({ document, onDocumentChange, onApiReady }: UniverSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef(document);
  const changeRef = useRef(onDocumentChange);

  useEffect(() => {
    documentRef.current = document;
    changeRef.current = onDocumentChange;
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const mount = window.document.createElement("div");
    mount.style.width = "100%";
    mount.style.height = "100%";
    containerRef.current.replaceChildren(mount);
    const { univer, univerAPI } = createUniver({
      locale: LocaleType.ZH_CN,
      locales: {
        [LocaleType.ZH_CN]: mergeLocales(zhCN),
      },
      presets: [
        UniverSheetsCorePreset({
          container: mount,
          header: true,
          toolbar: true,
          ribbonType: "simple",
          contextMenu: true,
          footer: {
            sheetBar: true,
            statisticBar: true,
            menus: true,
            zoomSlider: true,
          },
        }),
      ],
    });
    univerAPI.createWorkbook(workbookToUniverSnapshot(documentRef.current) as IWorkbookData);
    onApiReady(univerAPI);

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const disposable = univerAPI.addEvent(univerAPI.Event.CommandExecuted, ({ id }) => {
      if (ignoredCommands.has(id)) return;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const snapshot = univerAPI.getActiveWorkbook()?.save();
        if (!snapshot) return;
        changeRef.current(mergeUniverSnapshotIntoWorkbook(
          snapshot as unknown as UniverWorkbookSnapshot,
          documentRef.current,
        ));
      }, 180);
    });

    return () => {
      clearTimeout(timeout);
      disposable.dispose();
      setTimeout(() => {
        onApiReady(null);
        univer.dispose();
        mount.remove();
      }, 0);
    };
  }, [onApiReady]);

  return <div ref={containerRef} className="univer-host" data-testid="spreadsheet-editor" />;
}
