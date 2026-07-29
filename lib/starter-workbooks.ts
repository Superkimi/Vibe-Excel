import type { WorkbookDocument, WorkbookSheet } from "@/lib/workbook-schema";

const now = () => new Date().toISOString();

function sheet(
  id: string,
  name: string,
  cells: WorkbookSheet["cells"],
  options: Partial<WorkbookSheet> = {},
): WorkbookSheet {
  return {
    id,
    name,
    rowCount: 200,
    columnCount: 26,
    frozenRows: 1,
    frozenColumns: 0,
    cells,
    merges: [],
    columnWidths: { A: 190, B: 120, C: 120, D: 120, E: 140 },
    rowHeights: { "1": 34 },
    hiddenRows: [],
    hiddenColumns: [],
    ...options,
  };
}

const header = {
  background: "#6650a4",
  color: "#ffffff",
  bold: true,
  verticalAlign: "middle" as const,
};

export function createBlankWorkbook(title = "未命名工作簿"): WorkbookDocument {
  const timestamp = now();
  return {
    format: "vibe-excel/1",
    version: 1,
    id: crypto.randomUUID(),
    title,
    activeSheetId: "sheet-1",
    theme: {
      accent: "#6650a4",
      background: "#ffffff",
      text: "#24212a",
      grid: "#e6e1eb",
      headerBackground: "#f3eff8",
      headingFont: "Geist",
      bodyFont: "Geist",
    },
    sheets: [sheet("sheet-1", "Sheet 1", {})],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createBudgetWorkbook(): WorkbookDocument {
  const workbook = createBlankWorkbook("年度预算模型");
  workbook.activeSheetId = "budget";
  workbook.sheets = [
    sheet("budget", "年度预算", {
      A1: { value: "项目", type: "string", style: header },
      B1: { value: "Q1", type: "string", style: header },
      C1: { value: "Q2", type: "string", style: header },
      D1: { value: "Q3", type: "string", style: header },
      E1: { value: "Q4", type: "string", style: header },
      F1: { value: "全年", type: "string", style: header },
      A2: { value: "产品收入", type: "string" },
      B2: { value: 280000, type: "number", numberFormat: "¥#,##0" },
      C2: { value: 320000, type: "number", numberFormat: "¥#,##0" },
      D2: { value: 370000, type: "number", numberFormat: "¥#,##0" },
      E2: { value: 430000, type: "number", numberFormat: "¥#,##0" },
      F2: { value: null, formula: "=SUM(B2:E2)", type: "number", numberFormat: "¥#,##0", style: { bold: true } },
      A3: { value: "服务收入", type: "string" },
      B3: { value: 85000, type: "number", numberFormat: "¥#,##0" },
      C3: { value: 90000, type: "number", numberFormat: "¥#,##0" },
      D3: { value: 105000, type: "number", numberFormat: "¥#,##0" },
      E3: { value: 120000, type: "number", numberFormat: "¥#,##0" },
      F3: { value: null, formula: "=SUM(B3:E3)", type: "number", numberFormat: "¥#,##0", style: { bold: true } },
      A5: { value: "人员成本", type: "string" },
      B5: { value: 165000, type: "number", numberFormat: "¥#,##0" },
      C5: { value: 175000, type: "number", numberFormat: "¥#,##0" },
      D5: { value: 188000, type: "number", numberFormat: "¥#,##0" },
      E5: { value: 202000, type: "number", numberFormat: "¥#,##0" },
      F5: { value: null, formula: "=SUM(B5:E5)", type: "number", numberFormat: "¥#,##0" },
      A7: { value: "营业利润", type: "string", style: { bold: true, background: "#f3eff8" } },
      B7: { value: null, formula: "=SUM(B2:B3)-B5", type: "number", numberFormat: "¥#,##0", style: { bold: true, background: "#f3eff8" } },
      C7: { value: null, formula: "=SUM(C2:C3)-C5", type: "number", numberFormat: "¥#,##0", style: { bold: true, background: "#f3eff8" } },
      D7: { value: null, formula: "=SUM(D2:D3)-D5", type: "number", numberFormat: "¥#,##0", style: { bold: true, background: "#f3eff8" } },
      E7: { value: null, formula: "=SUM(E2:E3)-E5", type: "number", numberFormat: "¥#,##0", style: { bold: true, background: "#f3eff8" } },
      F7: { value: null, formula: "=SUM(F2:F3)-F5", type: "number", numberFormat: "¥#,##0", style: { bold: true, background: "#f3eff8" } },
    }, { columnWidths: { A: 190, B: 120, C: 120, D: 120, E: 120, F: 140 } }),
    sheet("assumptions", "关键假设", {
      A1: { value: "假设", type: "string", style: header },
      B1: { value: "数值", type: "string", style: header },
      C1: { value: "说明", type: "string", style: header },
      A2: { value: "季度增长率", type: "string" },
      B2: { value: 0.12, type: "number", numberFormat: "0.0%" },
      C2: { value: "用于收入预测", type: "string" },
    }),
  ];
  return workbook;
}

export function createProjectWorkbook(): WorkbookDocument {
  const workbook = createBlankWorkbook("产品上线计划");
  workbook.activeSheetId = "plan";
  workbook.sheets = [sheet("plan", "上线计划", {
    A1: { value: "任务", type: "string", style: header },
    B1: { value: "负责人", type: "string", style: header },
    C1: { value: "开始日期", type: "string", style: header },
    D1: { value: "截止日期", type: "string", style: header },
    E1: { value: "状态", type: "string", style: header },
    A2: { value: "确定发布范围", type: "string" },
    B2: { value: "林舟", type: "string" },
    C2: { value: "2026-08-03", type: "date", numberFormat: "yyyy-mm-dd" },
    D2: { value: "2026-08-05", type: "date", numberFormat: "yyyy-mm-dd" },
    E2: { value: "进行中", type: "string", style: { color: "#6650a4", bold: true } },
    A3: { value: "完成回归测试", type: "string" },
    B3: { value: "周宁", type: "string" },
    C3: { value: "2026-08-06", type: "date", numberFormat: "yyyy-mm-dd" },
    D3: { value: "2026-08-10", type: "date", numberFormat: "yyyy-mm-dd" },
    E3: { value: "未开始", type: "string" },
  })];
  return workbook;
}

export const workbookTemplates = [
  {
    id: "blank",
    title: "空白模型",
    description: "从自由表格开始",
    create: createBlankWorkbook,
  },
  {
    id: "budget",
    title: "年度预算",
    description: "收入、成本与利润公式",
    create: createBudgetWorkbook,
  },
  {
    id: "project",
    title: "上线计划",
    description: "任务、日期与责任人",
    create: createProjectWorkbook,
  },
] as const;
