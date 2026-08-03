import { indexToColumn, parseCellAddress, parseRangeAddress } from "@/lib/address";
import type { WorkbookCell, WorkbookChart, WorkbookSheet } from "@/lib/workbook-schema";

export type InferredDataType = "number" | "categorical" | "date";

export interface InferredValue {
  row: number;
  raw: string | number | boolean | null;
  display: string;
  numeric?: number;
  dateValue?: number;
}

export interface InferredColumn {
  column: string;
  label: string;
  type: InferredDataType;
  values: InferredValue[];
  rows: number;
  min?: number;
  max?: number;
  mean?: number;
  categories?: Array<{ label: string; count: number }>;
}

export interface InferredRow {
  row: number;
  values: Record<string, InferredValue | undefined>;
}

export interface InferredSheetData {
  headerRow: number;
  startColumn: number;
  endColumn: number;
  endRow: number;
  columns: InferredColumn[];
  rows: InferredRow[];
}

export interface ChartSeries {
  key: string;
  label: string;
  values: number[];
}

export interface CategoryChartModel {
  type: "bar" | "line";
  title: string;
  empty: boolean;
  labels: string[];
  series: ChartSeries[];
  xLabel: string;
}

export interface ScatterChartModel {
  type: "scatter";
  title: string;
  empty: boolean;
  points: Array<{ x: number; y: number; row: number; label: string }>;
  xLabel: string;
  yLabel: string;
}

export interface HistogramChartModel {
  type: "histogram";
  title: string;
  empty: boolean;
  bins: Array<{ label: string; count: number; start: number; end: number }>;
  valueLabel: string;
}

export interface CorrelationChartModel {
  type: "correlation";
  title: string;
  empty: boolean;
  labels: string[];
  matrix: number[][];
}

export type ChartModel = CategoryChartModel | ScatterChartModel | HistogramChartModel | CorrelationChartModel;

const DATE_PATTERN = /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}(?:[T\s].*)?$/;

function isBlank(cell: WorkbookCell | undefined): boolean {
  return !cell || cell.value === null || (typeof cell.value === "string" && cell.value.trim() === "");
}

function displayValue(cell: WorkbookCell | undefined): string {
  if (isBlank(cell)) return "";
  if (cell?.value === true) return "TRUE";
  if (cell?.value === false) return "FALSE";
  return String(cell?.value ?? "");
}

function parseNumeric(cell: WorkbookCell | undefined): number | undefined {
  if (isBlank(cell)) return undefined;
  if (typeof cell?.value === "number" && Number.isFinite(cell.value)) return cell.value;
  if (typeof cell?.value !== "string") return undefined;
  const raw = cell.value.trim();
  if (!raw) return undefined;
  const isPercent = cell.numberFormat?.includes("%") || raw.endsWith("%");
  const normalized = raw.replace(/[,$¥€£\s]/g, "").replace(/%$/, "");
  if (!/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) return undefined;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return undefined;
  return isPercent ? value / 100 : value;
}

function parseDateValue(cell: WorkbookCell | undefined): number | undefined {
  if (isBlank(cell)) return undefined;
  const value = cell?.value;
  if (cell?.type !== "date" && (typeof value !== "string" || !DATE_PATTERN.test(value.trim()))) return undefined;
  const timestamp = Date.parse(String(value));
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function classify(values: Array<{ cell: WorkbookCell | undefined; value: InferredValue }>): InferredDataType {
  if (values.length === 0) return "categorical";
  const dateCount = values.filter(({ value }) => value.dateValue !== undefined).length;
  const numberCount = values.filter(({ value }) => value.numeric !== undefined).length;
  if (dateCount > 0 && dateCount / values.length >= 0.75) return "date";
  if (numberCount > 0 && numberCount / values.length >= 0.75) return "number";
  return "categorical";
}

function cellValue(cell: WorkbookCell | undefined, row: number): InferredValue {
  return {
    row,
    raw: cell?.value ?? null,
    display: displayValue(cell),
    numeric: parseNumeric(cell),
    dateValue: parseDateValue(cell),
  };
}

function rowBounds(sheet: WorkbookSheet, range?: string | null): { headerRow: number; startColumn: number; endColumn: number; endRow: number } {
  if (range) {
    try {
      const parsed = parseRangeAddress(range);
      return {
        headerRow: parsed.start.row,
        startColumn: parsed.start.column,
        endColumn: parsed.end.column,
        endRow: parsed.end.row,
      };
    } catch {
      // Fall through to automatic bounds when a caller passes a stale range.
    }
  }

  const positions = Object.keys(sheet.cells).filter((address) => !isBlank(sheet.cells[address])).map(parseCellAddress);
  if (positions.length === 0) return { headerRow: 0, startColumn: 0, endColumn: 0, endRow: 0 };
  const headerRow = Math.min(...positions.map((position) => position.row));
  const headerPositions = positions.filter((position) => position.row === headerRow);
  return {
    headerRow,
    startColumn: Math.min(...headerPositions.map((position) => position.column)),
    endColumn: Math.max(...positions.map((position) => position.column)),
    endRow: Math.max(...positions.map((position) => position.row)),
  };
}

export function inferSheetData(sheet: WorkbookSheet, range?: string | null): InferredSheetData {
  const bounds = rowBounds(sheet, range);
  const columns: InferredColumn[] = [];
  const rows: InferredRow[] = [];

  for (let columnIndex = bounds.startColumn; columnIndex <= bounds.endColumn; columnIndex += 1) {
    const column = indexToColumn(columnIndex);
    const headerCell = sheet.cells[`${column}${bounds.headerRow + 1}`];
    const values = [] as Array<{ cell: WorkbookCell | undefined; value: InferredValue }>;
    for (let row = bounds.headerRow + 1; row <= bounds.endRow; row += 1) {
      const cell = sheet.cells[`${column}${row + 1}`];
      if (!isBlank(cell)) values.push({ cell, value: cellValue(cell, row) });
    }
    const type = classify(values);
    const typedValues = values.map(({ value }) => ({ ...value, numeric: type === "number" ? value.numeric : undefined }));
    const numericValues = typedValues.map((value) => value.numeric).filter((value): value is number => value !== undefined);
    const frequencies = new Map<string, number>();
    for (const value of typedValues) {
      if (value.display) frequencies.set(value.display, (frequencies.get(value.display) ?? 0) + 1);
    }
    columns.push({
      column,
      label: displayValue(headerCell) || column,
      type,
      values: typedValues,
      rows: typedValues.length,
      min: numericValues.length ? Math.min(...numericValues) : undefined,
      max: numericValues.length ? Math.max(...numericValues) : undefined,
      mean: numericValues.length ? numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length : undefined,
      categories: frequencies.size ? [...frequencies.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24).map(([label, count]) => ({ label, count })) : undefined,
    });
  }

  const valuesByColumn = new Map(columns.map((column) => [column.column, new Map(column.values.map((value) => [value.row, value]))]));
  for (let row = bounds.headerRow + 1; row <= bounds.endRow; row += 1) {
    const values: Record<string, InferredValue | undefined> = {};
    let populated = false;
    for (const column of columns) {
      const value = valuesByColumn.get(column.column)?.get(row);
      values[column.column] = value;
      if (value?.display) populated = true;
    }
    if (populated) rows.push({ row, values });
  }

  return { ...bounds, columns, rows };
}

function emptyModel(chart: WorkbookChart): ChartModel {
  if (chart.type === "bar" || chart.type === "line") {
    return { type: chart.type, title: chart.title, empty: true, labels: [], series: [], xLabel: "" };
  }
  if (chart.type === "scatter") {
    return { type: "scatter", title: chart.title, empty: true, points: [], xLabel: "", yLabel: "" };
  }
  if (chart.type === "histogram") {
    return { type: "histogram", title: chart.title, empty: true, bins: [], valueLabel: "" };
  }
  return { type: "correlation", title: chart.title, empty: true, labels: [], matrix: [] };
}

function findColumn(data: InferredSheetData, column: string | null | undefined): InferredColumn | undefined {
  return column ? data.columns.find((item) => item.column === column) : undefined;
}

function numericValue(row: InferredRow, column: InferredColumn | undefined): number | undefined {
  return column ? row.values[column.column]?.numeric : undefined;
}

function aggregate(values: number[], aggregation: WorkbookChart["aggregation"]): number {
  if (aggregation === "count") return values.length;
  if (values.length === 0) return 0;
  const sum = values.reduce((total, value) => total + value, 0);
  return aggregation === "average" ? sum / values.length : sum;
}

function buildCategoryModel(data: InferredSheetData, chart: WorkbookChart): CategoryChartModel {
  const xColumn = findColumn(data, chart.xColumn);
  const yColumns = chart.yColumns.map((column) => findColumn(data, column)).filter((column): column is InferredColumn => Boolean(column));
  const groups = new Map<string, { label: string; sortValue: number; rows: InferredRow[] }>();
  for (const row of data.rows) {
    const xValue = xColumn ? row.values[xColumn.column] : undefined;
    const label = xValue?.display || `Row ${row.row + 1}`;
    const sortValue = xValue?.dateValue ?? row.row;
    const group = groups.get(label) ?? { label, sortValue, rows: [] };
    group.rows.push(row);
    groups.set(label, group);
  }
  const sortedGroups = [...groups.values()].sort((a, b) => xColumn?.type === "date" ? a.sortValue - b.sortValue : 0);
  const labels = sortedGroups.map((group) => group.label);
  const series = yColumns.map((column) => ({
    key: column.column,
    label: column.label,
    values: sortedGroups.map((group) => aggregate(
      group.rows.map((row) => numericValue(row, column)).filter((value): value is number => value !== undefined),
      chart.aggregation,
    )),
  }));
  return {
    type: chart.type === "line" ? "line" : "bar",
    title: chart.title,
    empty: labels.length === 0 || series.length === 0,
    labels,
    series,
    xLabel: xColumn?.label ?? "Row",
  };
}

function buildScatterModel(data: InferredSheetData, chart: WorkbookChart): ScatterChartModel {
  const xColumn = findColumn(data, chart.xColumn);
  const yColumn = findColumn(data, chart.yColumns[0]);
  if (!xColumn || !yColumn) return emptyModel(chart) as ScatterChartModel;
  const points = data.rows.flatMap((row) => {
    const x = numericValue(row, xColumn);
    const y = numericValue(row, yColumn);
    return x === undefined || y === undefined ? [] : [{ x, y, row: row.row, label: `Row ${row.row + 1}` }];
  });
  return { type: "scatter", title: chart.title, empty: points.length === 0, points, xLabel: xColumn.label, yLabel: yColumn.label };
}

function buildHistogramModel(data: InferredSheetData, chart: WorkbookChart): HistogramChartModel {
  const column = findColumn(data, chart.yColumns[0]);
  if (!column) return emptyModel(chart) as HistogramChartModel;
  const numericValues = column.values.map((value) => value.numeric).filter((value): value is number => value !== undefined);
  if (numericValues.length === 0) {
    const bins = (column.categories ?? []).map((category) => ({ label: category.label, count: category.count, start: 0, end: 0 }));
    return { type: "histogram", title: chart.title, empty: bins.length === 0, bins, valueLabel: column.label };
  }
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const binCount = Math.min(10, Math.max(1, Math.ceil(Math.sqrt(numericValues.length))));
  const width = min === max ? 1 : (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => {
    const start = min + index * width;
    const end = index === binCount - 1 ? max : start + width;
    const count = numericValues.filter((value) => index === binCount - 1 ? value >= start && value <= end : value >= start && value < end).length;
    return { label: min === max ? String(min) : `${formatNumber(start)}–${formatNumber(end)}`, count, start, end };
  });
  return { type: "histogram", title: chart.title, empty: false, bins, valueLabel: column.label };
}

function pearson(left: number[], right: number[]): number {
  if (left.length < 2 || left.length !== right.length) return 0;
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  let numerator = 0;
  let leftVariance = 0;
  let rightVariance = 0;
  left.forEach((value, index) => {
    const leftDelta = value - leftMean;
    const rightDelta = right[index] - rightMean;
    numerator += leftDelta * rightDelta;
    leftVariance += leftDelta ** 2;
    rightVariance += rightDelta ** 2;
  });
  const denominator = Math.sqrt(leftVariance * rightVariance);
  return denominator === 0 ? 0 : Math.max(-1, Math.min(1, numerator / denominator));
}

function buildCorrelationModel(data: InferredSheetData, chart: WorkbookChart): CorrelationChartModel {
  const columns = chart.yColumns.map((column) => findColumn(data, column)).filter((column): column is InferredColumn => Boolean(column));
  const labels = columns.map((column) => column.label);
  const matrix = columns.map((left) => columns.map((right) => {
    const paired = data.rows.flatMap((row) => {
      const leftValue = numericValue(row, left);
      const rightValue = numericValue(row, right);
      return leftValue === undefined || rightValue === undefined ? [] : [{ left: leftValue, right: rightValue }];
    });
    return pearson(paired.map((pair) => pair.left), paired.map((pair) => pair.right));
  }));
  return { type: "correlation", title: chart.title, empty: labels.length < 2, labels, matrix };
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString();
  return Number(value.toFixed(2)).toString();
}

export function buildChartModel(sheet: WorkbookSheet | undefined, chart: WorkbookChart): ChartModel {
  if (!sheet || chart.sheetId !== sheet.id) return emptyModel(chart);
  const data = inferSheetData(sheet, chart.range);
  if (chart.type === "bar" || chart.type === "line") return buildCategoryModel(data, chart);
  if (chart.type === "scatter") return buildScatterModel(data, chart);
  if (chart.type === "histogram") return buildHistogramModel(data, chart);
  return buildCorrelationModel(data, chart);
}

export function chartDefaultColumns(data: InferredSheetData, type: WorkbookChart["type"]): { xColumn: string | null; yColumns: string[] } {
  const numeric = data.columns.filter((column) => column.type === "number");
  const categoricalOrDate = data.columns.find((column) => column.type === "categorical" || column.type === "date");
  if (type === "scatter") return { xColumn: numeric[0]?.column ?? null, yColumns: numeric[1] ? [numeric[1].column] : numeric[0] ? [numeric[0].column] : [] };
  if (type === "correlation") return { xColumn: null, yColumns: numeric.slice(0, 6).map((column) => column.column) };
  if (type === "histogram") return { xColumn: null, yColumns: numeric[0] ? [numeric[0].column] : data.columns[0] ? [data.columns[0].column] : [] };
  return { xColumn: categoricalOrDate?.column ?? null, yColumns: numeric.slice(0, 4).map((column) => column.column) };
}
