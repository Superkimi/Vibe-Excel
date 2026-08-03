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
import { useStudioI18n, type StudioMessageKey } from "@/components/studio/StudioI18n";
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

interface LastChange {
  key?: StudioMessageKey;
  values?: Record<string, string | number>;
  text?: string;
}

export function StudioShell() {
  const { locale, setLocale, t } = useStudioI18n();
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
  const [lastChange, setLastChange] = useState<LastChange>({ key: "studio.loadedExample" });
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
    setLastChange({ key: "studio.manualSynced" });
  }, []);

  const commitExternal = useCallback((next: WorkbookDocument, summary: string | LastChange) => {
    setSaved(false);
    setDocument((current) => {
      setHistory((items) => [...items.slice(-39), current]);
      return next;
    });
    setFuture([]);
    setRevision((value) => value + 1);
    setLastChange(typeof summary === "string" ? { text: summary } : summary);
  }, []);

  const undoExternal = async () => {
    if (history.length > 0) {
      const previous = history[history.length - 1];
      setFuture((items) => [document, ...items].slice(0, 40));
      setHistory((items) => items.slice(0, -1));
      setDocument(previous);
      setRevision((value) => value + 1);
      setLastChange({ key: "studio.undone" });
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
      setLastChange({ key: "studio.redone" });
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
    commitExternal(imported, { key: "studio.imported", values: { name: file.name } });
  };

  const addSheet = () => {
    const id = `sheet-${crypto.randomUUID().slice(0, 8)}`;
    const blank = createBlankWorkbook();
    const next = applyWorkbookOperations(document, [{
      op: "add_sheet",
      afterSheetId: document.sheets.at(-1)?.id ?? null,
      sheet: { ...blank.sheets[0], id, name: `Sheet ${document.sheets.length + 1}` },
    }]);
    commitExternal(next, { key: "studio.sheetAdded" });
  };

  return (
    <main className={`studio-shell ${leftOpen ? "" : "left-collapsed"}`}>
      <header className="studio-toolbar">
        <div className="studio-brand">
          <Link href="/" className="brand-mark" aria-label={t("studio.home")}><Function weight="bold" /></Link>
          <div>
            <input
              value={document.title}
              onChange={(event) => {
                setSaved(false);
                setDocument((current) => ({ ...current, title: event.target.value, updatedAt: new Date().toISOString() }));
              }}
              aria-label={t("studio.workbookName")}
            />
            <span><CloudCheck weight="fill" /> {saved ? t("studio.saved") : t("studio.saving")}<i />{lastChange.key ? t(lastChange.key, lastChange.values) : lastChange.text}</span>
          </div>
        </div>
        <div className="toolbar-actions">
          <button className="icon-button" onClick={() => setLeftOpen((value) => !value)} aria-label={t("studio.toggleCatalog")}><SidebarSimple /></button>
          <span className="toolbar-divider" />
          <button className="icon-button" onClick={undoExternal} aria-label={t("studio.undo")}><ArrowCounterClockwise /></button>
          <button className="icon-button" onClick={redoExternal} aria-label={t("studio.redo")}><ArrowClockwise /></button>
          <span className="toolbar-divider" />
          <button className="button button-secondary" onClick={() => fileInputRef.current?.click()}><FileArrowUp /> {t("studio.import")}</button>
          <button className="button button-secondary" onClick={() => setPreviewOpen(true)}><Eye /> {t("studio.preview")}</button>
          <button className="button button-primary" onClick={exportFile} disabled={exporting}><DownloadSimple /> {exporting ? t("studio.exporting") : t("studio.export")} <CaretDown /></button>
          <div className="locale-switcher" role="group" aria-label={t("studio.switchLanguage")}>
            <button type="button" data-testid="locale-zh" aria-label={t("studio.chinese")} aria-pressed={locale === "zh"} className={locale === "zh" ? "active" : ""} onClick={() => setLocale("zh")}>中</button>
            <button type="button" data-testid="locale-en" aria-label={t("studio.english")} aria-pressed={locale === "en"} className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")}>EN</button>
          </div>
          <Link href="/" className="icon-button home-link" aria-label={t("studio.productHome")}><House /></Link>
        </div>
        <input ref={fileInputRef} className="visually-hidden" type="file" accept=".xlsx,.xlsm" onChange={(event) => importFile(event.target.files?.[0])} />
      </header>

      {leftOpen && (
        <WorkbookNavigator
          document={document}
          activeTab={navigatorTab}
          onActiveTabChange={setNavigatorTab}
          onTemplate={(create) => commitExternal(create(), { key: "studio.templateApplied" })}
          onShowSchema={() => setSchemaOpen(true)}
          onAddSheet={addSheet}
        />
      )}

      <section className="spreadsheet-stage">
        <UniverSheet
          key={`${revision}-${locale}`}
          document={document}
          locale={locale}
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
