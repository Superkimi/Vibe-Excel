"use client";

import type ExcelJS from "exceljs";
import { indexToColumn } from "@/lib/address";
import { workbookSchema, type WorkbookDocument, type WorkbookSheet } from "@/lib/workbook-schema";
import { createBlankWorkbook } from "@/lib/starter-workbooks";

function safeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, "-").trim() || "vibe-excel";
}

function applyCellStyle(cell: ExcelJS.Cell, source: WorkbookSheet["cells"][string]): void {
  const style = source.style;
  if (style) {
    cell.font = {
      name: style.fontFamily,
      size: style.fontSize,
      bold: style.bold,
      italic: style.italic,
      underline: style.underline,
      color: style.color ? { argb: style.color.replace("#", "FF") } : undefined,
    };
    cell.fill = style.background
      ? { type: "pattern", pattern: "solid", fgColor: { argb: style.background.replace("#", "FF") } }
      : cell.fill;
    cell.alignment = {
      horizontal: style.horizontalAlign,
      vertical: style.verticalAlign === "middle" ? "middle" : style.verticalAlign,
      wrapText: style.wrap,
    };
    if (style.borderColor) {
      const side = { style: "thin" as const, color: { argb: style.borderColor.replace("#", "FF") } };
      cell.border = { top: side, bottom: side, left: side, right: side };
    }
  }
  if (source.numberFormat) cell.numFmt = source.numberFormat;
  if (source.note) cell.note = source.note;
}

export async function documentToExcelBuffer(document: WorkbookDocument): Promise<ArrayBuffer> {
  const Excel = await import("exceljs");
  const workbook = new Excel.Workbook();
  workbook.creator = "Vibe Excel";
  workbook.created = new Date(document.createdAt);
  workbook.modified = new Date(document.updatedAt);
  workbook.title = document.title;

  for (const source of document.sheets) {
    const sheet = workbook.addWorksheet(source.name, {
      views: [{ state: "frozen", xSplit: source.frozenColumns, ySplit: source.frozenRows }],
      properties: {
        defaultRowHeight: 22,
      },
    });
    for (const [address, sourceCell] of Object.entries(source.cells)) {
      const cell = sheet.getCell(address);
      if (sourceCell.formula) {
        cell.value = {
          formula: sourceCell.formula.replace(/^=/, ""),
          result: sourceCell.value === null ? undefined : sourceCell.value,
        };
      } else {
        cell.value = sourceCell.value;
      }
      applyCellStyle(cell, sourceCell);
    }
    for (const [column, width] of Object.entries(source.columnWidths)) {
      sheet.getColumn(column).width = Math.max(4, width / 7);
    }
    for (const [row, height] of Object.entries(source.rowHeights)) {
      sheet.getRow(Number(row)).height = height * 0.75;
    }
    for (const row of source.hiddenRows) sheet.getRow(row).hidden = true;
    for (const column of source.hiddenColumns) sheet.getColumn(column).hidden = true;
    for (const range of source.merges) sheet.mergeCells(range);
  }

  return await workbook.xlsx.writeBuffer();
}

export async function downloadExcel(document: WorkbookDocument): Promise<void> {
  const buffer = await documentToExcelBuffer(document);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFileName(document.title)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadWorkbookJson(document: WorkbookDocument): void {
  const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFileName(document.title)}.vibe.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function excelColorToHex(color?: Partial<ExcelJS.Color>): string | undefined {
  if (color && "argb" in color && typeof color.argb === "string") {
    return `#${color.argb.slice(-6)}`;
  }
  return undefined;
}

function readExcelValue(cell: ExcelJS.Cell): { value: string | number | boolean | null; formula?: string; type: WorkbookSheet["cells"][string]["type"] } {
  const value = cell.value;
  if (value && typeof value === "object" && "formula" in value) {
    const result = value.result;
    return {
      value: typeof result === "string" || typeof result === "number" || typeof result === "boolean" ? result : null,
      formula: `=${value.formula}`,
      type: typeof result === "number" ? "number" : "string",
    };
  }
  if (value instanceof Date) {
    return { value: value.toISOString().slice(0, 10), type: "date" };
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return { value, type: typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "string" };
  }
  if (value && typeof value === "object" && "richText" in value) {
    return { value: value.richText.map((run) => run.text).join(""), type: "string" };
  }
  return { value: null, type: "blank" };
}

export async function importExcelFile(file: File): Promise<WorkbookDocument> {
  const Excel = await import("exceljs");
  const excel = new Excel.Workbook();
  await excel.xlsx.load(await file.arrayBuffer());
  const document = createBlankWorkbook(file.name.replace(/\.xlsx?$/i, ""));
  document.id = crypto.randomUUID();
  document.sheets = excel.worksheets.map((source, index) => {
    const cells: WorkbookSheet["cells"] = {};
    source.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const parsed = readExcelValue(cell);
        const background = cell.fill.type === "pattern" ? excelColorToHex(cell.fill.fgColor) : undefined;
        const style = {
          background,
          color: excelColorToHex(cell.font.color),
          fontFamily: cell.font.name,
          fontSize: cell.font.size,
          bold: cell.font.bold,
          italic: cell.font.italic,
          underline: Boolean(cell.font.underline),
          horizontalAlign: cell.alignment.horizontal === "center" || cell.alignment.horizontal === "right"
            ? cell.alignment.horizontal
            : "left" as const,
          verticalAlign: cell.alignment.vertical === "top" || cell.alignment.vertical === "bottom"
            ? cell.alignment.vertical
            : "middle" as const,
          wrap: cell.alignment.wrapText,
        };
        cells[cell.address] = {
          ...parsed,
          numberFormat: cell.numFmt || undefined,
          style: Object.values(style).some((value) => value !== undefined) ? style : undefined,
          note: typeof cell.note === "string" ? cell.note : undefined,
        };
      });
    });
    const columnWidths: Record<string, number> = {};
    source.columns.forEach((column, columnIndex) => {
      if (column.width) columnWidths[indexToColumn(columnIndex)] = column.width * 7;
    });
    const rowHeights: Record<string, number> = {};
    const hiddenRows: number[] = [];
    source.eachRow({ includeEmpty: true }, (row) => {
      if (row.height) rowHeights[String(row.number)] = row.height / 0.75;
      if (row.hidden) hiddenRows.push(row.number);
    });
    const frozenView = source.views[0] as { xSplit?: number; ySplit?: number } | undefined;
    return {
      id: `sheet-${index + 1}-${crypto.randomUUID().slice(0, 8)}`,
      name: source.name,
      rowCount: Math.max(200, source.rowCount + 50),
      columnCount: Math.max(26, source.columnCount + 10),
      frozenRows: Number(frozenView?.ySplit ?? 0),
      frozenColumns: Number(frozenView?.xSplit ?? 0),
      cells,
      merges: Object.keys(source.model.merges ?? {}),
      columnWidths,
      rowHeights,
      hiddenRows,
      hiddenColumns: source.columns
        .map((column, columnIndex) => column.hidden ? indexToColumn(columnIndex) : null)
        .filter((value): value is string => value !== null),
    };
  });
  if (!document.sheets.length) throw new Error("The workbook does not contain any worksheets");
  document.activeSheetId = document.sheets[0].id;
  document.updatedAt = new Date().toISOString();
  return workbookSchema.parse(document);
}
