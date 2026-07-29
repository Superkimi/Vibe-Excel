"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FUniver } from "@univerjs/presets";
import {
  ArrowCounterClockwise,
  ArrowClockwise,
  CaretDown,
  CloudCheck,
  DownloadSimple,
  Eye,
  FileArrowUp,
  Function,
  House,
  SidebarSimple,
} from "@phosphor-icons/react";
import Link from "next/link";
import { AiPanel } from "@/components/studio/AiPanel";
import { ModelSettingsDialog } from "@/components/studio/ModelSettingsDialog";
import { PreviewDialog } from "@/components/studio/PreviewDialog";
import { SchemaDialog } from "@/components/studio/SchemaDialog";
import { WorkbookNavigator } from "@/components/studio/WorkbookNavigator";
import { downloadExcel, importExcelFile } from "@/lib/excel-io";
import { defaultModelSettings, type ModelSettings } from "@/lib/model-settings";
import { applyWorkbookOperations } from "@/lib/workbook-operations";
import { createBudgetWorkbook, createBlankWorkbook } from "@/lib/starter-workbooks";
import type { WorkbookDocument } from "@/lib/workbook-schema";

const UniverSheet = dynamic(
  () => import("@/components/studio/UniverSheet").then((module) => module.UniverSheet),
  { ssr: false, loading: () => <div className="editor-skeleton"><span /><span /><span /><span /></div> },
);

const DOCUMENT_STORAGE_KEY = "vibe-excel-document-v1";
const SETTINGS_STORAGE_KEY = "vibe-excel-model-settings-v1";

export function StudioShell() {
  const [document, setDocument] = useState<WorkbookDocument>(() => createBudgetWorkbook());
  const [revision, setRevision] = useState(0);
  const [navigatorTab, setNavigatorTab] = useState<"sheets" | "templates">("sheets");
  const [settings, setSettings] = useState<ModelSettings>(defaultModelSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(true);
  const [lastChange, setLastChange] = useState("已载入示例模型");
  const [history, setHistory] = useState<WorkbookDocument[]>([]);
  const [future, setFuture] = useState<WorkbookDocument[]>([]);
  const [api, setApi] = useState<FUniver | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const storedDocument = localStorage.getItem(DOCUMENT_STORAGE_KEY);
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      queueMicrotask(() => {
        if (storedDocument) {
          setDocument(JSON.parse(storedDocument) as WorkbookDocument);
          setRevision((value) => value + 1);
        }
        if (storedSettings) setSettings({ ...defaultModelSettings, ...JSON.parse(storedSettings) as ModelSettings });
      });
    } catch {
      localStorage.removeItem(DOCUMENT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(DOCUMENT_STORAGE_KEY, JSON.stringify(document));
      setSaved(true);
    }, 350);
    return () => clearTimeout(timeout);
  }, [document]);

  const handleApiReady = useCallback((nextApi: FUniver | null) => setApi(nextApi), []);
  const handleManualChange = useCallback((next: WorkbookDocument) => {
    setSaved(false);
    setDocument(next);
    setLastChange("手工修改已同步");
  }, []);

  const commitExternal = useCallback((next: WorkbookDocument, summary: string) => {
    setSaved(false);
    setDocument((current) => {
      setHistory((items) => [...items.slice(-39), current]);
      return next;
    });
    setFuture([]);
    setRevision((value) => value + 1);
    setLastChange(summary);
  }, []);

  const undoExternal = async () => {
    if (history.length > 0) {
      const previous = history[history.length - 1];
      setFuture((items) => [document, ...items].slice(0, 40));
      setHistory((items) => items.slice(0, -1));
      setDocument(previous);
      setRevision((value) => value + 1);
      setLastChange("已撤销 AI 或模板修改");
    } else {
      await api?.undo();
    }
  };

  const redoExternal = async () => {
    if (future.length > 0) {
      const next = future[0];
      setHistory((items) => [...items, document].slice(-40));
      setFuture((items) => items.slice(1));
      setDocument(next);
      setRevision((value) => value + 1);
      setLastChange("已重做修改");
    } else {
      await api?.redo();
    }
  };

  const saveSettings = (next: ModelSettings) => {
    setSettings(next);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  };

  const exportFile = async () => {
    setExporting(true);
    try {
      await downloadExcel(document);
    } finally {
      setExporting(false);
    }
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    const imported = await importExcelFile(file);
    commitExternal(imported, `已导入 ${file.name}`);
  };

  const addSheet = () => {
    const id = `sheet-${crypto.randomUUID().slice(0, 8)}`;
    const blank = createBlankWorkbook();
    const next = applyWorkbookOperations(document, [{
      op: "add_sheet",
      afterSheetId: document.sheets.at(-1)?.id ?? null,
      sheet: { ...blank.sheets[0], id, name: `Sheet ${document.sheets.length + 1}` },
    }]);
    commitExternal(next, "已添加工作表");
  };

  return (
    <main className={`studio-shell ${leftOpen ? "" : "left-collapsed"}`}>
      <header className="studio-toolbar">
        <div className="studio-brand">
          <Link href="/" className="brand-mark" aria-label="返回首页"><Function weight="bold" /></Link>
          <div>
            <input
              value={document.title}
              onChange={(event) => {
                setSaved(false);
                setDocument((current) => ({ ...current, title: event.target.value, updatedAt: new Date().toISOString() }));
              }}
              aria-label="工作簿名称"
            />
            <span><CloudCheck weight="fill" /> {saved ? "已保存到浏览器" : "正在保存"}<i />{lastChange}</span>
          </div>
        </div>
        <div className="toolbar-actions">
          <button className="icon-button" onClick={() => setLeftOpen((value) => !value)} aria-label="切换目录"><SidebarSimple /></button>
          <span className="toolbar-divider" />
          <button className="icon-button" onClick={undoExternal} aria-label="撤销"><ArrowCounterClockwise /></button>
          <button className="icon-button" onClick={redoExternal} aria-label="重做"><ArrowClockwise /></button>
          <span className="toolbar-divider" />
          <button className="button button-secondary" onClick={() => fileInputRef.current?.click()}><FileArrowUp /> 导入</button>
          <button className="button button-secondary" onClick={() => setPreviewOpen(true)}><Eye /> 预览</button>
          <button className="button button-primary" onClick={exportFile} disabled={exporting}><DownloadSimple /> {exporting ? "正在导出" : "导出 XLSX"} <CaretDown /></button>
          <Link href="/" className="icon-button home-link" aria-label="产品首页"><House /></Link>
        </div>
        <input ref={fileInputRef} className="visually-hidden" type="file" accept=".xlsx,.xlsm" onChange={(event) => importFile(event.target.files?.[0])} />
      </header>

      {leftOpen && (
        <WorkbookNavigator
          document={document}
          activeTab={navigatorTab}
          onActiveTabChange={setNavigatorTab}
          onTemplate={(create) => commitExternal(create(), "已应用工作簿模板")}
          onShowSchema={() => setSchemaOpen(true)}
          onAddSheet={addSheet}
        />
      )}

      <section className="spreadsheet-stage">
        <UniverSheet
          key={revision}
          document={document}
          onDocumentChange={handleManualChange}
          onApiReady={handleApiReady}
        />
      </section>

      <AiPanel document={document} settings={settings} onSettings={() => setSettingsOpen(true)} onApply={commitExternal} />

      {settingsOpen && <ModelSettingsDialog value={settings} onChange={saveSettings} onClose={() => setSettingsOpen(false)} />}
      {previewOpen && <PreviewDialog document={document} onClose={() => setPreviewOpen(false)} onExport={exportFile} />}
      {schemaOpen && <SchemaDialog document={document} onClose={() => setSchemaOpen(false)} />}
    </main>
  );
}
