"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type StudioLocale = "zh" | "en";

const LOCALE_STORAGE_KEY = "vibe-excel-locale-v1";

const messages = {
  zh: {
    "studio.loadedExample": "已载入示例模型",
    "studio.manualSynced": "手工修改已同步",
    "studio.undone": "已撤销 AI 或模板修改",
    "studio.redone": "已重做修改",
    "studio.imported": "已导入 {{name}}",
    "studio.sheetAdded": "已添加工作表",
    "studio.templateApplied": "已应用工作簿模板",
    "studio.home": "返回首页",
    "studio.workbookName": "工作簿名称",
    "studio.saved": "已保存到浏览器",
    "studio.saving": "正在保存",
    "studio.toggleCatalog": "切换目录",
    "studio.undo": "撤销",
    "studio.redo": "重做",
    "studio.import": "导入",
    "studio.preview": "预览",
    "studio.export": "导出 XLSX",
    "studio.exporting": "正在导出",
    "studio.productHome": "产品首页",
    "studio.language": "界面语言",
    "studio.chinese": "中文",
    "studio.english": "English",
    "studio.switchLanguage": "切换界面语言",
    "ai.settings": "模型设置",
    "ai.notConnected": "尚未连接模型",
    "ai.emptyTitle": "想把这张表变成什么？",
    "ai.emptyDescription": "描述目标、受众和已有假设。Vibe AI 会先生成操作，再写入模型。",
    "ai.sheetCount": "{{count}} 张工作表",
    "ai.formulaCount": "{{count}} 个公式",
    "ai.user": "你",
    "ai.applied": "已应用 {{count}} 项修改",
    "ai.requestNotWritten": "请求未写入工作簿",
    "ai.configure": "配置模型后开始对话",
    "ai.prompt": "例如：做一个 12 个月现金流模型，并标出资金缺口",
    "ai.sendHint": "Enter 发送，Shift + Enter 换行",
    "ai.send": "发送",
    "ai.requestFailed": "模型请求失败",
    "ai.operation.set_cells": "写入单元格",
    "ai.operation.clear_range": "清空范围",
    "ai.operation.patch_range": "调整范围",
    "ai.operation.add_sheet": "添加工作表",
    "ai.operation.delete_sheet": "删除工作表",
    "ai.operation.rename_sheet": "重命名",
    "ai.operation.resize_columns": "调整列宽",
    "ai.operation.resize_rows": "调整行高",
    "ai.operation.set_freeze": "设置冻结",
    "ai.operation.merge_cells": "合并单元格",
    "ai.operation.unmerge_cells": "取消合并",
    "ai.operation.set_theme": "更新主题",
    "ai.operation.set_title": "更新标题",
    "ai.operation.replace_workbook": "重建模型",
    "ai.suggestion.budget": "根据当前数据补齐季度汇总和利润公式",
    "ai.suggestion.style": "统一标题样式、数字格式和列宽",
    "ai.suggestion.project": "创建一个清晰的项目跟踪模型",
    "settings.title": "模型连接",
    "settings.description": "配置只保存在当前浏览器。Key 不会写入仓库。",
    "settings.close": "关闭",
    "settings.provider": "服务类型",
    "settings.openai": "OpenAI 兼容接口",
    "settings.anthropic": "Anthropic",
    "settings.google": "Google Gemini",
    "settings.baseUrl": "Base URL",
    "settings.baseUrlHelp": "支持 OpenRouter、DeepSeek、Moonshot 和本地兼容网关。",
    "settings.model": "模型名称",
    "settings.modelPlaceholder": "例如 gpt-5.4",
    "settings.apiKey": "API Key",
    "settings.hideKey": "隐藏 Key",
    "settings.showKey": "显示 Key",
    "settings.temperature": "创造性 {{value}}",
    "settings.temperatureHelp": "表格建模建议保持在 0.0-0.3，减少公式和结构漂移。",
    "settings.test": "测试连接",
    "settings.testing": "正在测试",
    "settings.save": "保存配置",
    "settings.connectionSuccess": "连接成功，{{latency}} ms",
    "settings.connectionFailed": "连接失败",
    "nav.aria": "工作簿导航",
    "nav.sheets": "目录",
    "nav.templates": "模板",
    "nav.worksheets": "工作表",
    "nav.addSheet": "添加工作表",
    "nav.sheetCells": "{{count}} 个单元格",
    "nav.modelOverview": "模型概览",
    "nav.effectiveCells": "有效单元格",
    "nav.formulas": "公式",
    "nav.schema": "Schema 代码",
    "nav.schemaHelp": "查看并复制当前模型",
    "nav.templatesHelp": "选择一个经过验证的结构，再交给 AI 调整。",
    "template.blank.title": "空白模型",
    "template.blank.description": "从自由表格开始",
    "template.budget.title": "年度预算",
    "template.budget.description": "收入、成本与利润公式",
    "template.project.title": "上线计划",
    "template.project.description": "任务、日期与责任人",
    "preview.delivery": "{{sheet}} 的交付预览",
    "preview.export": "导出 XLSX",
    "preview.close": "关闭预览",
    "schema.title": "工作簿 Schema",
    "schema.description": "`vibe-excel/1` 是编辑器、AI 与导出器共享的模型。",
    "schema.close": "关闭",
    "schema.cells": "{{count}} 个有效单元格",
    "schema.download": "下载 JSON",
    "schema.copy": "复制代码",
    "schema.copied": "已复制",
    "agent.thinking": "理解模型",
    "agent.applying": "写入操作",
    "agent.done": "校验完成",
    "agent.error": "需要调整",
    "agent.idle": "准备建模",
  },
  en: {
    "studio.loadedExample": "Example model loaded",
    "studio.manualSynced": "Manual edit synced",
    "studio.undone": "Undid AI or template changes",
    "studio.redone": "Change redone",
    "studio.imported": "Imported {{name}}",
    "studio.sheetAdded": "Worksheet added",
    "studio.templateApplied": "Workbook template applied",
    "studio.home": "Back to home",
    "studio.workbookName": "Workbook name",
    "studio.saved": "Saved in this browser",
    "studio.saving": "Saving",
    "studio.toggleCatalog": "Toggle catalog",
    "studio.undo": "Undo",
    "studio.redo": "Redo",
    "studio.import": "Import",
    "studio.preview": "Preview",
    "studio.export": "Export XLSX",
    "studio.exporting": "Exporting",
    "studio.productHome": "Product home",
    "studio.language": "Interface language",
    "studio.chinese": "中文",
    "studio.english": "English",
    "studio.switchLanguage": "Switch interface language",
    "ai.settings": "Model settings",
    "ai.notConnected": "No model connected",
    "ai.emptyTitle": "What should this sheet become?",
    "ai.emptyDescription": "Describe the goal, audience, and assumptions. Vibe AI generates validated operations before changing the model.",
    "ai.sheetCount": "{{count}} sheets",
    "ai.formulaCount": "{{count}} formulas",
    "ai.user": "You",
    "ai.applied": "Applied {{count}} changes",
    "ai.requestNotWritten": "The request was not written to the workbook",
    "ai.configure": "Configure a model to start chatting",
    "ai.prompt": "For example: build a 12-month cash flow model and flag funding gaps",
    "ai.sendHint": "Enter to send, Shift + Enter for a new line",
    "ai.send": "Send",
    "ai.requestFailed": "Model request failed",
    "ai.operation.set_cells": "Write cells",
    "ai.operation.clear_range": "Clear range",
    "ai.operation.patch_range": "Patch range",
    "ai.operation.add_sheet": "Add worksheet",
    "ai.operation.delete_sheet": "Delete worksheet",
    "ai.operation.rename_sheet": "Rename worksheet",
    "ai.operation.resize_columns": "Resize columns",
    "ai.operation.resize_rows": "Resize rows",
    "ai.operation.set_freeze": "Set freeze panes",
    "ai.operation.merge_cells": "Merge cells",
    "ai.operation.unmerge_cells": "Unmerge cells",
    "ai.operation.set_theme": "Update theme",
    "ai.operation.set_title": "Update title",
    "ai.operation.replace_workbook": "Rebuild model",
    "ai.suggestion.budget": "Complete quarterly rollups and profit formulas from the current data",
    "ai.suggestion.style": "Unify title styles, number formats, and column widths",
    "ai.suggestion.project": "Create a clear project tracking model",
    "settings.title": "Model connection",
    "settings.description": "Settings stay in this browser. Your key is never committed to the repository.",
    "settings.close": "Close",
    "settings.provider": "Provider",
    "settings.openai": "OpenAI-compatible API",
    "settings.anthropic": "Anthropic",
    "settings.google": "Google Gemini",
    "settings.baseUrl": "Base URL",
    "settings.baseUrlHelp": "Supports OpenRouter, DeepSeek, Moonshot, and local compatible gateways.",
    "settings.model": "Model name",
    "settings.modelPlaceholder": "For example, gpt-5.4",
    "settings.apiKey": "API key",
    "settings.hideKey": "Hide key",
    "settings.showKey": "Show key",
    "settings.temperature": "Creativity {{value}}",
    "settings.temperatureHelp": "For spreadsheet modeling, 0.0-0.3 helps reduce formula and structure drift.",
    "settings.test": "Test connection",
    "settings.testing": "Testing",
    "settings.save": "Save settings",
    "settings.connectionSuccess": "Connected in {{latency}} ms",
    "settings.connectionFailed": "Connection failed",
    "nav.aria": "Workbook navigation",
    "nav.sheets": "Sheets",
    "nav.templates": "Templates",
    "nav.worksheets": "Worksheets",
    "nav.addSheet": "Add worksheet",
    "nav.sheetCells": "{{count}} cells",
    "nav.modelOverview": "Model overview",
    "nav.effectiveCells": "Populated cells",
    "nav.formulas": "Formulas",
    "nav.schema": "Schema code",
    "nav.schemaHelp": "View and copy the current model",
    "nav.templatesHelp": "Choose a validated structure, then let AI refine it.",
    "template.blank.title": "Blank model",
    "template.blank.description": "Start from a freeform sheet",
    "template.budget.title": "Annual budget",
    "template.budget.description": "Revenue, costs, and profit formulas",
    "template.project.title": "Launch plan",
    "template.project.description": "Tasks, dates, and owners",
    "preview.delivery": "{{sheet}} delivery preview",
    "preview.export": "Export XLSX",
    "preview.close": "Close preview",
    "schema.title": "Workbook Schema",
    "schema.description": "`vibe-excel/1` is the shared model for the editor, AI, and exporter.",
    "schema.close": "Close",
    "schema.cells": "{{count}} populated cells",
    "schema.download": "Download JSON",
    "schema.copy": "Copy code",
    "schema.copied": "Copied",
    "agent.thinking": "Understanding model",
    "agent.applying": "Writing operations",
    "agent.done": "Validation complete",
    "agent.error": "Needs adjustment",
    "agent.idle": "Ready to model",
  },
} as const;

export type StudioMessageKey = keyof typeof messages.zh;

function formatMessage(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

interface StudioI18nContextValue {
  locale: StudioLocale;
  setLocale: (locale: StudioLocale) => void;
  t: (key: StudioMessageKey, values?: Record<string, string | number>) => string;
}

const StudioI18nContext = createContext<StudioI18nContextValue | null>(null);

export function StudioI18nProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, setLocale] = useState<StudioLocale>("zh");
  const initializedRef = useRef(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "zh" || stored === "en") queueMicrotask(() => setLocale(stored));
    else {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, "zh");
      window.document.documentElement.lang = "zh-CN";
    }
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    window.document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
  }, [locale]);

  const t = useCallback((key: StudioMessageKey, values?: Record<string, string | number>) => {
    return formatMessage(messages[locale][key] ?? messages.zh[key], values);
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);
  return <StudioI18nContext.Provider value={value}>{children}</StudioI18nContext.Provider>;
}

export function useStudioI18n(): StudioI18nContextValue {
  const context = useContext(StudioI18nContext);
  if (!context) throw new Error("useStudioI18n must be used within StudioI18nProvider");
  return context;
}
