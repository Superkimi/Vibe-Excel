"use client";

import { ChartBar, ChartScatter, Check, LineSegments, Plus, Trash, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { ChartView } from "@/components/studio/ChartView";
import { useStudioI18n } from "@/components/studio/StudioI18n";
import { chartDefaultColumns, inferSheetData } from "@/lib/chart-data";
import { applyWorkbookOperations } from "@/lib/workbook-operations";
import type { ChartAggregation, ChartType, WorkbookChart, WorkbookDocument } from "@/lib/workbook-schema";

interface ChartDialogProps {
  document: WorkbookDocument;
  onClose: () => void;
  onApply: (document: WorkbookDocument, summary: string) => void;
}

const chartTypes: Array<{ value: ChartType; icon: typeof ChartBar }> = [
  { value: "bar", icon: ChartBar },
  { value: "line", icon: LineSegments },
  { value: "scatter", icon: ChartScatter },
  { value: "histogram", icon: ChartBar },
  { value: "correlation", icon: ChartBar },
];

function initialType(data: ReturnType<typeof inferSheetData>): ChartType {
  const numeric = data.columns.filter((column) => column.type === "number");
  if (data.columns.some((column) => column.type === "date") && numeric.length > 0) return "line";
  if (numeric.length >= 2 && !data.columns.some((column) => column.type === "categorical")) return "scatter";
  if (numeric.length > 0) return "bar";
  return "histogram";
}

function defaultTitle(type: ChartType, sheetName: string, translate: (key: "chart.bar" | "chart.line" | "chart.scatter" | "chart.histogram" | "chart.correlation") => string): string {
  return `${translate(`chart.${type}` as "chart.bar")} · ${sheetName}`;
}

export function ChartDialog({ document, onClose, onApply }: ChartDialogProps) {
  const { t } = useStudioI18n();
  const initialSheet = document.sheets.find((sheet) => sheet.id === document.activeSheetId) ?? document.sheets[0];
  const [sourceSheetId, setSourceSheetId] = useState(initialSheet.id);
  const sourceSheet = document.sheets.find((sheet) => sheet.id === sourceSheetId) ?? initialSheet;
  const data = useMemo(() => inferSheetData(sourceSheet), [sourceSheet]);
  const initialChartType = initialType(data);
  const initialColumns = chartDefaultColumns(data, initialChartType);
  const [type, setType] = useState<ChartType>(initialChartType);
  const [title, setTitle] = useState("");
  const [range, setRange] = useState("");
  const [xColumn, setXColumn] = useState<string | null>(initialColumns.xColumn);
  const [yColumns, setYColumns] = useState<string[]>(initialColumns.yColumns);
  const [aggregation, setAggregation] = useState<ChartAggregation>("sum");

  const previewChart: WorkbookChart = {
    id: "chart-preview",
    type,
    title: title.trim() || defaultTitle(type, sourceSheet.name, t),
    sheetId: sourceSheet.id,
    range: range.trim() || null,
    xColumn: type === "histogram" || type === "correlation" ? null : xColumn,
    yColumns,
    aggregation,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const changeType = (nextType: ChartType) => {
    setType(nextType);
    const nextColumns = chartDefaultColumns(data, nextType);
    setXColumn(nextColumns.xColumn);
    setYColumns(nextColumns.yColumns);
  };

  const changeSheet = (nextSheetId: string) => {
    const nextSheet = document.sheets.find((sheet) => sheet.id === nextSheetId) ?? initialSheet;
    const nextData = inferSheetData(nextSheet);
    const nextType = initialType(nextData);
    const nextColumns = chartDefaultColumns(nextData, nextType);
    setSourceSheetId(nextSheet.id);
    setType(nextType);
    setXColumn(nextColumns.xColumn);
    setYColumns(nextColumns.yColumns);
    setRange("");
  };

  const toggleYColumn = (column: string) => {
    setYColumns((current) => current.includes(column) ? current.filter((item) => item !== column) : [...current, column].slice(0, 16));
  };

  const saveChart = () => {
    if (yColumns.length === 0 || (type === "scatter" && !xColumn)) return;
    const timestamp = new Date().toISOString();
    const chart: WorkbookChart = {
      ...previewChart,
      id: `chart-${crypto.randomUUID().slice(0, 10)}`,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const next = applyWorkbookOperations(document, [{ op: "add_chart", chart }]);
    onApply(next, t("chart.savedSummary", { title: chart.title }));
  };

  const removeChart = (chart: WorkbookChart) => {
    const next = applyWorkbookOperations(document, [{ op: "delete_chart", chartId: chart.id }]);
    onApply(next, t("chart.removedSummary", { title: chart.title }));
  };

  const savedCharts = document.charts ?? [];
  return (
    <div className="dialog-backdrop chart-backdrop" role="presentation">
      <section className="chart-dialog" role="dialog" aria-modal="true" aria-label={t("chart.dialogTitle")} data-testid="chart-dialog">
        <header className="chart-dialog-header">
          <div><span className="chart-dialog-icon"><ChartBar weight="duotone" /></span><div><h2>{t("chart.dialogTitle")}</h2><p>{t("chart.description")}</p></div></div>
          <button className="icon-button" onClick={onClose} aria-label={t("chart.close")}><X /></button>
        </header>
        <div className="chart-dialog-body">
          <div className="chart-layout">
            <div className="chart-config">
              <div className="chart-local-note"><Check weight="bold" /> {t("chart.localNote")}</div>
              <label>{t("chart.title")}
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={defaultTitle(type, sourceSheet.name, t)} />
              </label>
              <label>{t("chart.sheet")}
                <select value={sourceSheet.id} onChange={(event) => changeSheet(event.target.value)}>{document.sheets.map((sheet) => <option key={sheet.id} value={sheet.id}>{sheet.name}</option>)}</select>
              </label>
              <label>{t("chart.range")}
                <input value={range} onChange={(event) => setRange(event.target.value.toUpperCase())} placeholder={t("chart.rangePlaceholder")} />
              </label>
              <div className="chart-field-label">{t("chart.type")}</div>
              <div className="chart-type-grid">
                {chartTypes.map(({ value, icon: Icon }) => <button key={value} className={type === value ? "active" : ""} onClick={() => changeType(value)}><Icon /><span>{t(`chart.${value}` as "chart.bar")}</span></button>)}
              </div>
              {type !== "histogram" && type !== "correlation" && <label>{t("chart.xAxis")}
                <select value={xColumn ?? ""} onChange={(event) => setXColumn(event.target.value || null)}>
                  <option value="">{t("chart.rowIndex")}</option>
                  {data.columns.map((column) => <option key={column.column} value={column.column}>{column.label} ({column.column})</option>)}
                </select>
              </label>}
              <div className="chart-field-label">{type === "correlation" ? t("chart.correlationColumns") : t("chart.yAxis")}</div>
              <div className="chart-column-list">
                {data.columns.map((column) => <button key={column.column} className={yColumns.includes(column.column) ? "active" : ""} onClick={() => toggleYColumn(column.column)}><span>{column.label}</span><small>{column.type}</small>{yColumns.includes(column.column) && <Check />}</button>)}
                {data.columns.length === 0 && <span className="chart-muted">{t("chart.noColumns")}</span>}
              </div>
              {(type === "bar" || type === "line") && <label>{t("chart.aggregation")}
                <select value={aggregation} onChange={(event) => setAggregation(event.target.value as ChartAggregation)}>
                  <option value="sum">{t("chart.sum")}</option>
                  <option value="average">{t("chart.average")}</option>
                  <option value="count">{t("chart.count")}</option>
                </select>
              </label>}
              <button className="button button-primary chart-save" disabled={yColumns.length === 0 || (type === "scatter" && !xColumn)} onClick={saveChart}><Plus /> {t("chart.add")}</button>
            </div>
            <div className="chart-preview-panel">
              <div className="chart-panel-heading"><span>{t("chart.preview")}</span><small>{t("chart.rows", { count: data.rows.length })}</small></div>
              <ChartView sheet={sourceSheet} chart={previewChart} />
            </div>
          </div>
          <div className="saved-chart-section">
            <div className="chart-panel-heading"><span>{t("chart.saved")}</span><small>{t("chart.savedCount", { count: savedCharts.length })}</small></div>
            {savedCharts.length === 0 ? <div className="chart-empty saved-empty">{t("chart.noSaved")}</div> : <div className="chart-gallery">{savedCharts.map((chart) => {
              const sheet = document.sheets.find((item) => item.id === chart.sheetId);
              return <article key={chart.id}><ChartView sheet={sheet} chart={chart} compact /><button className="chart-remove" onClick={() => removeChart(chart)} aria-label={t("chart.remove", { title: chart.title })}><Trash /></button></article>;
            })}</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
