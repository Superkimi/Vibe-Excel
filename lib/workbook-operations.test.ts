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

  it("adds, updates, and removes charts as first-class model operations", () => {
    const source = createBudgetWorkbook();
    const timestamp = new Date().toISOString();
    const chart = {
      id: "chart-budget",
      type: "bar" as const,
      title: "季度收入",
      sheetId: "budget",
      range: null,
      xColumn: "A",
      yColumns: ["B", "C"],
      aggregation: "sum" as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const added = applyWorkbookOperations(source, [{ op: "add_chart", chart }]);
    expect(added.charts).toHaveLength(1);
    const updated = applyWorkbookOperations(added, [{ op: "update_chart", chartId: chart.id, patch: { title: "收入对比" } }]);
    expect(updated.charts[0].title).toBe("收入对比");
    const removed = applyWorkbookOperations(updated, [{ op: "delete_chart", chartId: chart.id }]);
    expect(removed.charts).toHaveLength(0);
  });

  it("removes charts when their source sheet is deleted", () => {
    const source = createBudgetWorkbook();
    const timestamp = new Date().toISOString();
    const withChart = applyWorkbookOperations(source, [{
      op: "add_chart",
      chart: {
        id: "chart-assumptions",
        type: "histogram",
        title: "假设",
        sheetId: "assumptions",
        range: null,
        xColumn: null,
        yColumns: ["B"],
        aggregation: "sum",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    }]);
    const next = applyWorkbookOperations(withChart, [{ op: "delete_sheet", sheetId: "assumptions" }]);
    expect(next.charts).toHaveLength(0);
  });
});
