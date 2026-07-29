import { indexToColumn, parseCellAddress, parseRangeAddress, toCellAddress } from "@/lib/address";
import type { CellStyle, WorkbookCell, WorkbookDocument, WorkbookSheet } from "@/lib/workbook-schema";

interface UniverCell {
  v?: string | number | boolean | null;
  f?: string;
  t?: number;
  s?: Record<string, unknown> | string;
  p?: { body?: { dataStream?: string } };
}

interface UniverSheetSnapshot {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  cellData?: Record<number, Record<number, UniverCell>>;
  rowData?: Record<number, { h?: number; hd?: boolean }>;
  columnData?: Record<number, { w?: number; hd?: boolean }>;
  mergeData?: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>;
  freeze?: { startRow: number; startColumn: number; xSplit: number; ySplit: number };
}

export interface UniverWorkbookSnapshot {
  id: string;
  name: string;
  appVersion?: string;
  locale?: string;
  sheetOrder: string[];
  sheets: Record<string, UniverSheetSnapshot>;
  styles?: Record<string, Record<string, unknown>>;
  resources?: Array<Record<string, unknown>>;
}

const horizontalAlign = { left: 1, center: 2, right: 3 } as const;
const verticalAlign = { top: 1, middle: 2, bottom: 3 } as const;

function toUniverStyle(style?: CellStyle, numberFormat?: string): Record<string, unknown> | undefined {
  if (!style && !numberFormat) return undefined;
  return {
    ...(style?.background ? { bg: { rgb: style.background } } : {}),
    ...(style?.color ? { cl: { rgb: style.color } } : {}),
    ...(style?.fontFamily ? { ff: style.fontFamily } : {}),
    ...(style?.fontSize ? { fs: style.fontSize } : {}),
    ...(style?.bold !== undefined ? { bl: style.bold ? 1 : 0 } : {}),
    ...(style?.italic !== undefined ? { it: style.italic ? 1 : 0 } : {}),
    ...(style?.underline !== undefined ? { ul: { s: style.underline ? 1 : 0 } } : {}),
    ...(style?.horizontalAlign ? { ht: horizontalAlign[style.horizontalAlign] } : {}),
    ...(style?.verticalAlign ? { vt: verticalAlign[style.verticalAlign] } : {}),
    ...(style?.wrap !== undefined ? { tb: style.wrap ? 1 : 0 } : {}),
    ...(numberFormat ? { n: { pattern: numberFormat } } : {}),
    ...(style?.borderColor
      ? {
          bd: {
            t: { s: 1, cl: { rgb: style.borderColor } },
            b: { s: 1, cl: { rgb: style.borderColor } },
            l: { s: 1, cl: { rgb: style.borderColor } },
            r: { s: 1, cl: { rgb: style.borderColor } },
          },
        }
      : {}),
  };
}

function toUniverCell(cell: WorkbookCell): UniverCell {
  const value = cell.type === "date" && typeof cell.value === "string"
    ? (Date.parse(`${cell.value}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86_400_000
    : cell.value;
  return {
    ...(value !== null ? { v: value } : {}),
    ...(cell.formula ? { f: cell.formula.startsWith("=") ? cell.formula : `=${cell.formula}` } : {}),
    t: cell.type === "number" || cell.type === "date" ? 2 : cell.type === "boolean" ? 3 : 1,
    ...(toUniverStyle(cell.style, cell.numberFormat) ? { s: toUniverStyle(cell.style, cell.numberFormat) } : {}),
    ...(cell.note ? { p: { body: { dataStream: `${cell.note}\r\n` } } } : {}),
  };
}

function sheetToSnapshot(sheet: WorkbookSheet): UniverSheetSnapshot {
  const cellData: Record<number, Record<number, UniverCell>> = {};
  for (const [address, cell] of Object.entries(sheet.cells)) {
    const { row, column } = parseCellAddress(address);
    cellData[row] ??= {};
    cellData[row][column] = toUniverCell(cell);
  }

  const rowData: UniverSheetSnapshot["rowData"] = {};
  for (const [row, height] of Object.entries(sheet.rowHeights)) {
    rowData[Number(row) - 1] = { h: height, hd: sheet.hiddenRows.includes(Number(row)) };
  }
  for (const row of sheet.hiddenRows) {
    rowData[row - 1] = { ...rowData[row - 1], hd: true };
  }

  const columnData: UniverSheetSnapshot["columnData"] = {};
  for (const [column, width] of Object.entries(sheet.columnWidths)) {
    const index = parseCellAddress(`${column}1`).column;
    columnData[index] = { w: width, hd: sheet.hiddenColumns.includes(column) };
  }
  for (const column of sheet.hiddenColumns) {
    const index = parseCellAddress(`${column}1`).column;
    columnData[index] = { ...columnData[index], hd: true };
  }

  return {
    id: sheet.id,
    name: sheet.name,
    rowCount: sheet.rowCount,
    columnCount: sheet.columnCount,
    cellData,
    rowData,
    columnData,
    mergeData: sheet.merges.map((range) => {
      const parsed = parseRangeAddress(range);
      return {
        startRow: parsed.start.row,
        endRow: parsed.end.row,
        startColumn: parsed.start.column,
        endColumn: parsed.end.column,
      };
    }),
    freeze: {
      startRow: sheet.frozenRows,
      startColumn: sheet.frozenColumns,
      xSplit: sheet.frozenColumns,
      ySplit: sheet.frozenRows,
    },
  };
}

export function workbookToUniverSnapshot(workbook: WorkbookDocument): UniverWorkbookSnapshot {
  return {
    id: workbook.id,
    name: workbook.title,
    appVersion: "1.0.0",
    locale: "zhCN",
    sheetOrder: workbook.sheets.map((sheet) => sheet.id),
    sheets: Object.fromEntries(workbook.sheets.map((sheet) => [sheet.id, sheetToSnapshot(sheet)])),
    styles: {},
    resources: [],
  };
}

function readRgb(value: unknown): string | undefined {
  if (typeof value === "object" && value && "rgb" in value && typeof value.rgb === "string") return value.rgb;
  return undefined;
}

function fromUniverStyle(style: unknown): { style?: CellStyle; numberFormat?: string } {
  if (!style || typeof style !== "object" || Array.isArray(style)) return {};
  const source = style as Record<string, unknown>;
  const cellStyle: CellStyle = {};
  if (source.bg && typeof source.bg === "object") cellStyle.background = readRgb((source.bg as Record<string, unknown>).rgb ? source.bg : undefined);
  if (source.cl) cellStyle.color = readRgb(source.cl);
  if (typeof source.ff === "string") cellStyle.fontFamily = source.ff;
  if (typeof source.fs === "number") cellStyle.fontSize = source.fs;
  if (source.bl !== undefined) cellStyle.bold = Boolean(source.bl);
  if (source.it !== undefined) cellStyle.italic = Boolean(source.it);
  const horizontal = Object.entries(horizontalAlign).find(([, value]) => value === source.ht)?.[0] as CellStyle["horizontalAlign"];
  const vertical = Object.entries(verticalAlign).find(([, value]) => value === source.vt)?.[0] as CellStyle["verticalAlign"];
  if (horizontal) cellStyle.horizontalAlign = horizontal;
  if (vertical) cellStyle.verticalAlign = vertical;
  if (source.tb !== undefined) cellStyle.wrap = Boolean(source.tb);
  const numberFormat = typeof source.n === "object" && source.n && "pattern" in source.n
    ? String(source.n.pattern)
    : undefined;
  return { style: Object.keys(cellStyle).length ? cellStyle : undefined, numberFormat };
}

function inferCellType(cell: UniverCell): WorkbookCell["type"] {
  if (cell.v === null || cell.v === undefined) return cell.f ? "number" : "blank";
  if (typeof cell.v === "number") return "number";
  if (typeof cell.v === "boolean") return "boolean";
  return "string";
}

function isDateFormat(numberFormat?: string): boolean {
  return Boolean(numberFormat && /(?:^|[^a-z])[ymd]{1,4}(?:[^a-z]|$)/i.test(numberFormat));
}

function excelSerialToIso(value: number): string {
  return new Date(Date.UTC(1899, 11, 30) + value * 86_400_000).toISOString().slice(0, 10);
}

export function mergeUniverSnapshotIntoWorkbook(
  snapshot: UniverWorkbookSnapshot,
  previous: WorkbookDocument,
): WorkbookDocument {
  const styleRegistry = snapshot.styles ?? {};
  const previousById = new Map(previous.sheets.map((sheet) => [sheet.id, sheet]));
  const sheets: WorkbookSheet[] = snapshot.sheetOrder
    .map((id) => snapshot.sheets[id])
    .filter(Boolean)
    .map((source) => {
      const oldSheet = previousById.get(source.id);
      const cells: WorkbookSheet["cells"] = {};
      for (const [rowKey, row] of Object.entries(source.cellData ?? {})) {
        for (const [columnKey, cell] of Object.entries(row)) {
          if (cell.v === undefined && !cell.f) continue;
          const rawStyle = typeof cell.s === "string" ? styleRegistry[cell.s] : cell.s;
          const parsedStyle = fromUniverStyle(rawStyle);
          const address = toCellAddress({ row: Number(rowKey), column: Number(columnKey) });
          const dateCell = typeof cell.v === "number" && isDateFormat(parsedStyle.numberFormat);
          cells[address] = {
            value: dateCell ? excelSerialToIso(cell.v as number) : cell.v ?? null,
            formula: cell.f,
            type: dateCell ? "date" : inferCellType(cell),
            ...parsedStyle,
          };
        }
      }

      return {
        id: source.id,
        name: source.name,
        rowCount: source.rowCount,
        columnCount: source.columnCount,
        frozenRows: source.freeze?.ySplit ?? 0,
        frozenColumns: source.freeze?.xSplit ?? 0,
        cells,
        merges: (source.mergeData ?? []).map((merge) => {
          const start = toCellAddress({ row: merge.startRow, column: merge.startColumn });
          const end = toCellAddress({ row: merge.endRow, column: merge.endColumn });
          return start === end ? start : `${start}:${end}`;
        }),
        columnWidths: Object.fromEntries(
          Object.entries(source.columnData ?? {})
            .filter(([, data]) => typeof data.w === "number")
            .map(([column, data]) => [indexToColumn(Number(column)), data.w as number]),
        ),
        rowHeights: Object.fromEntries(
          Object.entries(source.rowData ?? {})
            .filter(([, data]) => typeof data.h === "number")
            .map(([row, data]) => [String(Number(row) + 1), data.h as number]),
        ),
        hiddenRows: Object.entries(source.rowData ?? {})
          .filter(([, data]) => data.hd)
          .map(([row]) => Number(row) + 1),
        hiddenColumns: Object.entries(source.columnData ?? {})
          .filter(([, data]) => data.hd)
          .map(([column]) => indexToColumn(Number(column))),
        ...(oldSheet ? { id: oldSheet.id } : {}),
      };
    });

  return {
    ...previous,
    title: snapshot.name || previous.title,
    activeSheetId: sheets.some((sheet) => sheet.id === previous.activeSheetId)
      ? previous.activeSheetId
      : sheets[0]?.id ?? previous.activeSheetId,
    sheets,
    updatedAt: new Date().toISOString(),
  };
}
