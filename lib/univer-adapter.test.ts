import { describe, expect, it } from "vitest";
import { createBudgetWorkbook, createProjectWorkbook } from "@/lib/starter-workbooks";
import {
  mergeUniverSnapshotIntoWorkbook,
  workbookToUniverSnapshot,
} from "@/lib/univer-adapter";

describe("Univer adapter", () => {
  it("preserves values, formulas, formatting, dimensions, merges, and freeze state", () => {
    const document = createBudgetWorkbook();
    document.sheets[0].merges = ["A9:B9"];
    document.sheets[0].hiddenRows = [10];
    document.sheets[0].hiddenColumns = ["H"];
    const snapshot = workbookToUniverSnapshot(document);
    const roundTrip = mergeUniverSnapshotIntoWorkbook(snapshot, document);
    const budget = roundTrip.sheets[0];

    expect(budget.cells.F7.formula).toBe("=SUM(F2:F3)-F5");
    expect(budget.cells.A1.style).toMatchObject({ background: "#6650a4", color: "#ffffff", bold: true });
    expect(budget.columnWidths.A).toBe(190);
    expect(budget.rowHeights["1"]).toBe(34);
    expect(budget.frozenRows).toBe(1);
    expect(budget.merges).toContain("A9:B9");
    expect(budget.hiddenRows).toContain(10);
    expect(budget.hiddenColumns).toContain("H");
  });

  it("converts date serials back to ISO dates using the cell number format", () => {
    const document = createProjectWorkbook();
    const snapshot = workbookToUniverSnapshot(document);
    const roundTrip = mergeUniverSnapshotIntoWorkbook(snapshot, document);

    expect(roundTrip.sheets[0].cells.C2).toMatchObject({
      value: "2026-08-03",
      type: "date",
      numberFormat: "yyyy-mm-dd",
    });
  });
});
