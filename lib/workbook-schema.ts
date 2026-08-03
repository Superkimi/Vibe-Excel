import { z } from "zod";

const identifier = z.string().min(1).max(96);
const finite = z.number().finite();
const color = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
const cellAddress = z.string().regex(/^[A-Z]{1,3}[1-9][0-9]{0,5}$/);
const rangeAddress = z.string().regex(/^[A-Z]{1,3}[1-9][0-9]{0,5}(?::[A-Z]{1,3}[1-9][0-9]{0,5})?$/);
const columnAddress = z.string().regex(/^[A-Z]{1,3}$/);

export const cellStyleSchema = z.object({
  background: color.optional(),
  color: color.optional(),
  fontFamily: z.string().max(120).optional(),
  fontSize: finite.min(8).max(72).optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  horizontalAlign: z.enum(["left", "center", "right"]).optional(),
  verticalAlign: z.enum(["top", "middle", "bottom"]).optional(),
  wrap: z.boolean().optional(),
  borderColor: color.optional(),
}).strict();

export const cellSchema = z.object({
  value: z.union([z.string(), finite, z.boolean(), z.null()]).default(null),
  formula: z.string().max(4000).optional(),
  type: z.enum(["string", "number", "boolean", "date", "blank"]).default("string"),
  numberFormat: z.string().max(180).optional(),
  style: cellStyleSchema.optional(),
  note: z.string().max(4000).optional(),
}).strict();

export const sheetSchema = z.object({
  id: identifier,
  name: z.string().min(1).max(80),
  rowCount: z.number().int().min(1).max(100_000).default(200),
  columnCount: z.number().int().min(1).max(1_000).default(26),
  frozenRows: z.number().int().min(0).max(1_000).default(0),
  frozenColumns: z.number().int().min(0).max(100).default(0),
  cells: z.record(cellAddress, cellSchema).default({}),
  merges: z.array(rangeAddress).max(500).default([]),
  columnWidths: z.record(z.string(), finite.min(36).max(600)).default({}),
  rowHeights: z.record(z.string(), finite.min(18).max(300)).default({}),
  hiddenRows: z.array(z.number().int().min(1)).max(10_000).default([]),
  hiddenColumns: z.array(z.string().regex(/^[A-Z]{1,3}$/)).max(1_000).default([]),
}).strict();

export const workbookThemeSchema = z.object({
  accent: color.default("#6650a4"),
  background: color.default("#ffffff"),
  text: color.default("#24212a"),
  grid: color.default("#e6e1eb"),
  headerBackground: color.default("#f3eff8"),
  headingFont: z.string().max(120).default("Geist"),
  bodyFont: z.string().max(120).default("Geist"),
}).strict();

export const chartSchema = z.object({
  id: identifier,
  type: z.enum(["bar", "line", "scatter", "histogram", "correlation"]),
  title: z.string().min(1).max(180),
  sheetId: identifier,
  range: rangeAddress.nullable().default(null),
  xColumn: columnAddress.nullable().default(null),
  yColumns: z.array(columnAddress).min(1).max(16),
  aggregation: z.enum(["sum", "average", "count"]).default("sum"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

export const workbookSchema = z.object({
  format: z.literal("vibe-excel/1"),
  version: z.literal(1),
  id: identifier,
  title: z.string().min(1).max(180),
  activeSheetId: identifier,
  theme: workbookThemeSchema,
  sheets: z.array(sheetSchema).min(1).max(100),
  charts: z.array(chartSchema).max(40).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict().superRefine((workbook, context) => {
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const [index, sheet] of workbook.sheets.entries()) {
    if (ids.has(sheet.id)) {
      context.addIssue({ code: "custom", path: ["sheets", index, "id"], message: "Sheet IDs must be unique" });
    }
    if (names.has(sheet.name.toLocaleLowerCase())) {
      context.addIssue({ code: "custom", path: ["sheets", index, "name"], message: "Sheet names must be unique" });
    }
    ids.add(sheet.id);
    names.add(sheet.name.toLocaleLowerCase());
  }
  if (!ids.has(workbook.activeSheetId)) {
    context.addIssue({ code: "custom", path: ["activeSheetId"], message: "Active sheet must exist" });
  }
  const chartIds = new Set<string>();
  for (const [index, chart] of workbook.charts.entries()) {
    if (chartIds.has(chart.id)) {
      context.addIssue({ code: "custom", path: ["charts", index, "id"], message: "Chart IDs must be unique" });
    }
    if (!ids.has(chart.sheetId)) {
      context.addIssue({ code: "custom", path: ["charts", index, "sheetId"], message: "Chart sheet must exist" });
    }
    chartIds.add(chart.id);
  }
});

export type WorkbookDocument = z.infer<typeof workbookSchema>;
export type WorkbookSheet = z.infer<typeof sheetSchema>;
export type WorkbookCell = z.infer<typeof cellSchema>;
export type CellStyle = z.infer<typeof cellStyleSchema>;
export type WorkbookChart = z.infer<typeof chartSchema>;
export type ChartType = WorkbookChart["type"];
export type ChartAggregation = WorkbookChart["aggregation"];

const cellPatchSchema = cellSchema.partial().strict();

export const workbookOperationSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("set_cells"),
    sheetId: identifier,
    cells: z.record(cellAddress, cellSchema),
  }).strict(),
  z.object({
    op: z.literal("clear_range"),
    sheetId: identifier,
    range: rangeAddress,
  }).strict(),
  z.object({
    op: z.literal("patch_range"),
    sheetId: identifier,
    range: rangeAddress,
    patch: cellPatchSchema,
  }).strict(),
  z.object({
    op: z.literal("add_sheet"),
    afterSheetId: identifier.nullable(),
    sheet: sheetSchema,
  }).strict(),
  z.object({
    op: z.literal("delete_sheet"),
    sheetId: identifier,
  }).strict(),
  z.object({
    op: z.literal("rename_sheet"),
    sheetId: identifier,
    name: z.string().min(1).max(80),
  }).strict(),
  z.object({
    op: z.literal("resize_columns"),
    sheetId: identifier,
    widths: z.record(z.string().regex(/^[A-Z]{1,3}$/), finite.min(36).max(600)),
  }).strict(),
  z.object({
    op: z.literal("resize_rows"),
    sheetId: identifier,
    heights: z.record(z.string().regex(/^[1-9][0-9]{0,5}$/), finite.min(18).max(300)),
  }).strict(),
  z.object({
    op: z.literal("set_freeze"),
    sheetId: identifier,
    rows: z.number().int().min(0).max(1_000),
    columns: z.number().int().min(0).max(100),
  }).strict(),
  z.object({
    op: z.literal("merge_cells"),
    sheetId: identifier,
    range: rangeAddress,
  }).strict(),
  z.object({
    op: z.literal("unmerge_cells"),
    sheetId: identifier,
    range: rangeAddress,
  }).strict(),
  z.object({
    op: z.literal("set_theme"),
    patch: workbookThemeSchema.partial(),
  }).strict(),
  z.object({
    op: z.literal("set_title"),
    title: z.string().min(1).max(180),
  }).strict(),
  z.object({
    op: z.literal("add_chart"),
    chart: chartSchema,
  }).strict(),
  z.object({
    op: z.literal("update_chart"),
    chartId: identifier,
    patch: chartSchema.partial().omit({ id: true }),
  }).strict(),
  z.object({
    op: z.literal("delete_chart"),
    chartId: identifier,
  }).strict(),
  z.object({
    op: z.literal("replace_workbook"),
    workbook: workbookSchema,
  }).strict(),
]);

export const aiWorkbookResponseSchema = z.object({
  assistantMessage: z.string().min(1).max(4_000),
  summary: z.string().min(1).max(240),
  operations: z.array(workbookOperationSchema).min(1).max(120),
  qualityChecks: z.array(z.string().min(1).max(240)).max(12).default([]),
}).strict();

export type WorkbookOperation = z.infer<typeof workbookOperationSchema>;
export type AiWorkbookResponse = z.infer<typeof aiWorkbookResponseSchema>;

export const workbookJsonSchema = z.toJSONSchema(workbookSchema);
export const aiWorkbookResponseJsonSchema = z.toJSONSchema(aiWorkbookResponseSchema);
