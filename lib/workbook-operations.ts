import { addressesInRange, parseCellAddress } from "@/lib/address";
import {
  type WorkbookDocument,
  type WorkbookOperation,
  workbookSchema,
} from "@/lib/workbook-schema";

function cloneWorkbook(workbook: WorkbookDocument): WorkbookDocument {
  return structuredClone(workbook);
}

function findSheet(workbook: WorkbookDocument, sheetId: string) {
  const sheet = workbook.sheets.find((item) => item.id === sheetId);
  if (!sheet) throw new Error(`Sheet not found: ${sheetId}`);
  return sheet;
}

function assertWorkbookBounds(workbook: WorkbookDocument): void {
  for (const sheet of workbook.sheets) {
    for (const address of Object.keys(sheet.cells)) {
      const { row, column } = parseCellAddress(address);
      if (row >= sheet.rowCount || column >= sheet.columnCount) {
        throw new Error(`${sheet.name}!${address} is outside the configured sheet bounds`);
      }
    }
  }
}

export function applyWorkbookOperations(
  current: WorkbookDocument,
  operations: WorkbookOperation[],
): WorkbookDocument {
  let next = cloneWorkbook(current);
  next.charts ??= [];

  for (const operation of operations) {
    if (operation.op === "replace_workbook") {
      next = cloneWorkbook(operation.workbook);
      continue;
    }

    if (operation.op === "set_title") {
      next.title = operation.title;
      continue;
    }

    if (operation.op === "set_theme") {
      next.theme = { ...next.theme, ...operation.patch };
      continue;
    }

    if (operation.op === "add_sheet") {
      if (next.sheets.some((sheet) => sheet.id === operation.sheet.id || sheet.name.toLowerCase() === operation.sheet.name.toLowerCase())) {
        throw new Error(`Sheet already exists: ${operation.sheet.name}`);
      }
      const index = operation.afterSheetId === null
        ? -1
        : next.sheets.findIndex((sheet) => sheet.id === operation.afterSheetId);
      next.sheets.splice(index + 1, 0, cloneWorkbook({
        ...next,
        sheets: [operation.sheet],
        activeSheetId: operation.sheet.id,
      }).sheets[0]);
      next.activeSheetId = operation.sheet.id;
      continue;
    }

    if (operation.op === "delete_sheet") {
      if (next.sheets.length === 1) throw new Error("A workbook must keep at least one sheet");
      const index = next.sheets.findIndex((sheet) => sheet.id === operation.sheetId);
      if (index < 0) throw new Error(`Sheet not found: ${operation.sheetId}`);
      next.sheets.splice(index, 1);
      next.charts = next.charts.filter((chart) => chart.sheetId !== operation.sheetId);
      if (next.activeSheetId === operation.sheetId) {
        next.activeSheetId = next.sheets[Math.max(0, index - 1)].id;
      }
      continue;
    }

    if (operation.op === "add_chart") {
      if (next.charts.some((chart) => chart.id === operation.chart.id)) {
        throw new Error(`Chart already exists: ${operation.chart.id}`);
      }
      findSheet(next, operation.chart.sheetId);
      next.charts.push(structuredClone(operation.chart));
      continue;
    }

    if (operation.op === "update_chart") {
      const index = next.charts.findIndex((chart) => chart.id === operation.chartId);
      if (index < 0) throw new Error(`Chart not found: ${operation.chartId}`);
      const updated = { ...next.charts[index], ...operation.patch, id: next.charts[index].id };
      if (updated.sheetId) findSheet(next, updated.sheetId);
      next.charts[index] = updated;
      continue;
    }

    if (operation.op === "delete_chart") {
      const index = next.charts.findIndex((chart) => chart.id === operation.chartId);
      if (index < 0) throw new Error(`Chart not found: ${operation.chartId}`);
      next.charts.splice(index, 1);
      continue;
    }

    const sheet = findSheet(next, operation.sheetId);

    if (operation.op === "set_cells") {
      for (const [address, cell] of Object.entries(operation.cells)) {
        sheet.cells[address] = cell;
      }
    } else if (operation.op === "clear_range") {
      for (const address of addressesInRange(operation.range)) delete sheet.cells[address];
    } else if (operation.op === "patch_range") {
      for (const address of addressesInRange(operation.range)) {
        const existing = sheet.cells[address];
        const patched = {
          ...existing,
          ...operation.patch,
        };
        sheet.cells[address] = {
          ...patched,
          value: patched.value ?? null,
          type: patched.type ?? "blank",
          style: operation.patch.style
            ? { ...existing?.style, ...operation.patch.style }
            : existing?.style,
        };
      }
    } else if (operation.op === "rename_sheet") {
      if (next.sheets.some((item) => item.id !== sheet.id && item.name.toLowerCase() === operation.name.toLowerCase())) {
        throw new Error(`Sheet name already exists: ${operation.name}`);
      }
      sheet.name = operation.name;
    } else if (operation.op === "resize_columns") {
      sheet.columnWidths = { ...sheet.columnWidths, ...operation.widths };
    } else if (operation.op === "resize_rows") {
      sheet.rowHeights = { ...sheet.rowHeights, ...operation.heights };
    } else if (operation.op === "set_freeze") {
      sheet.frozenRows = operation.rows;
      sheet.frozenColumns = operation.columns;
    } else if (operation.op === "merge_cells") {
      if (!sheet.merges.includes(operation.range)) sheet.merges.push(operation.range);
    } else if (operation.op === "unmerge_cells") {
      sheet.merges = sheet.merges.filter((range) => range !== operation.range);
    }
  }

  next.updatedAt = new Date().toISOString();
  assertWorkbookBounds(next);
  return workbookSchema.parse(next);
}
