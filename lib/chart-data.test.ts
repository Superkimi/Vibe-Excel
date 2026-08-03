import { describe, expect, it } from "vitest";
import { buildChartModel, inferSheetData } from "@/lib/chart-data";
import { createBudgetWorkbook, createProjectWorkbook } from "@/lib/starter-workbooks";
import type { WorkbookChart } from "@/lib/workbook-schema";

function chart(type: WorkbookChart["type"], patch: Partial<WorkbookChart> = {}): WorkbookChart {
  const timestamp = new Date().toISOString();
  return {
    id: `test-${type}`,
    type,
    title: `Test ${type}`,
    sheetId: "budget",
    range: null,
    xColumn: "A",
    yColumns: ["B", "C"],
    aggregation: "sum",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...patch,
  };
}

describe("chart data inference", () => {
  it("infers categorical and numeric fields from a workbook sheet", () => {
    const sheet = createBudgetWorkbook().sheets[0];
    const data = inferSheetData(sheet);
    expect(data.headerRow).toBe(0);
    expect(data.columns.find((column) => column.column === "A")).toMatchObject({ type: "categorical", label: "项目" });
    expect(data.columns.find((column) => column.column === "B")).toMatchObject({ type: "number", min: 85000, max: 280000 });
    expect(data.rows).toHaveLength(4);
  });

  it("recognizes project dates and respects an explicit source range", () => {
    const sheet = createProjectWorkbook().sheets[0];
    const data = inferSheetData(sheet, "A1:D3");
    expect(data.columns.find((column) => column.column === "C")).toMatchObject({ type: "date" });
    expect(data.endRow).toBe(2);
    expect(data.columns).toHaveLength(4);
  });

  it("builds bar, line, scatter, histogram, and correlation models", () => {
    const workbook = createBudgetWorkbook();
    const sheet = workbook.sheets[0];
    const bar = buildChartModel(sheet, chart("bar", { yColumns: ["B", "C"] }));
    expect(bar).toMatchObject({ type: "bar", empty: false, labels: ["产品收入", "服务收入", "人员成本", "营业利润"] });
    expect(bar.type === "bar" ? bar.series : []).toHaveLength(2);

    const line = buildChartModel(sheet, chart("line", { yColumns: ["B"] }));
    expect(line.type).toBe("line");
    const scatter = buildChartModel(sheet, chart("scatter", { xColumn: "B", yColumns: ["C"] }));
    expect(scatter.type === "scatter" ? scatter.points : []).toHaveLength(3);
    const histogram = buildChartModel(sheet, chart("histogram", { xColumn: null, yColumns: ["B"] }));
    expect(histogram.type === "histogram" ? histogram.bins.reduce((sum, bin) => sum + bin.count, 0) : 0).toBe(3);
    const correlation = buildChartModel(sheet, chart("correlation", { xColumn: null, yColumns: ["B", "C", "D"] }));
    expect(correlation.type === "correlation" ? correlation.matrix : []).toHaveLength(3);
    expect(correlation.type === "correlation" ? correlation.matrix[0][0] : 0).toBeCloseTo(1);
  });

  it("returns a useful empty state for missing chart fields", () => {
    const sheet = createBudgetWorkbook().sheets[0];
    const model = buildChartModel(sheet, chart("scatter", { xColumn: "Z", yColumns: ["Y"] }));
    expect(model.empty).toBe(true);
  });
});
