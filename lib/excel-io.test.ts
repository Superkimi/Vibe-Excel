import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { documentToExcelBuffer } from "@/lib/excel-io";
import { createBudgetWorkbook } from "@/lib/starter-workbooks";

describe("XLSX export", () => {
  it("produces a readable workbook with formulas, formats, widths, and frozen panes", async () => {
    const document = createBudgetWorkbook();
    const buffer = await documentToExcelBuffer(document);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const budget = workbook.getWorksheet("年度预算");

    expect(budget).toBeDefined();
    expect(budget?.getCell("B2").value).toBe(280000);
    expect(budget?.getCell("F7").value).toMatchObject({ formula: "SUM(F2:F3)-F5" });
    expect(budget?.getCell("B2").numFmt).toBe("¥#,##0");
    expect(budget?.getCell("A1").font.bold).toBe(true);
    expect(budget?.getCell("A1").fill).toMatchObject({ type: "pattern" });
    expect(budget?.getColumn("A").width).toBeGreaterThan(20);
    expect(budget?.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
  });
});
