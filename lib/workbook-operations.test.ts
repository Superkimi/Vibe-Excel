import { describe, expect, it } from "vitest";
import { createBudgetWorkbook } from "@/lib/starter-workbooks";
import { applyWorkbookOperations } from "@/lib/workbook-operations";

describe("workbook operations", () => {
  it("applies cell, format, resize, freeze, and title changes atomically", () => {
    const source = createBudgetWorkbook();
    const next = applyWorkbookOperations(source, [
      {
        op: "set_cells",
        sheetId: "budget",
        cells: {
          G1: { value: "说明", type: "string", style: { bold: true } },
          G2: { value: "示例假设", type: "string" },
        },
      },
      {
        op: "patch_range",
        sheetId: "budget",
        range: "B2:F2",
        patch: { style: { background: "#eee8f7", bold: true } },
      },
      { op: "resize_columns", sheetId: "budget", widths: { G: 180 } },
      { op: "set_freeze", sheetId: "budget", rows: 1, columns: 1 },
      { op: "set_title", title: "经复核的年度预算" },
    ]);

    expect(next).not.toBe(source);
    expect(next.title).toBe("经复核的年度预算");
    expect(next.sheets[0].cells.G2.value).toBe("示例假设");
    expect(next.sheets[0].cells.B2.style).toMatchObject({ background: "#eee8f7", bold: true });
    expect(next.sheets[0].columnWidths.G).toBe(180);
    expect(next.sheets[0].frozenColumns).toBe(1);
    expect(source.sheets[0].cells.G2).toBeUndefined();
  });

  it("protects the final sheet from deletion", () => {
    const source = createBudgetWorkbook();
    const oneSheet = { ...source, sheets: [source.sheets[0]], activeSheetId: "budget" };
    expect(() => applyWorkbookOperations(oneSheet, [{ op: "delete_sheet", sheetId: "budget" }]))
      .toThrow(/at least one sheet/);
  });

  it("rejects cells outside configured bounds", () => {
    const source = createBudgetWorkbook();
    expect(() => applyWorkbookOperations(source, [{
      op: "set_cells",
      sheetId: "budget",
      cells: { AA999: { value: 1, type: "number" } },
    }])).toThrow(/outside/);
  });
});
