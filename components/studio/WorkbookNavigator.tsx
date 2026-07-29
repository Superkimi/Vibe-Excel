"use client";

import {
  BracketsCurly,
  CaretRight,
  FileXls,
  GridFour,
  Plus,
  Table,
} from "@phosphor-icons/react";
import type { WorkbookDocument } from "@/lib/workbook-schema";
import { workbookTemplates } from "@/lib/starter-workbooks";

interface WorkbookNavigatorProps {
  document: WorkbookDocument;
  activeTab: "sheets" | "templates";
  onActiveTabChange: (tab: "sheets" | "templates") => void;
  onTemplate: (create: () => WorkbookDocument) => void;
  onShowSchema: () => void;
  onAddSheet: () => void;
}

export function WorkbookNavigator({
  document,
  activeTab,
  onActiveTabChange,
  onTemplate,
  onShowSchema,
  onAddSheet,
}: WorkbookNavigatorProps) {
  const populatedCells = document.sheets.reduce((sum, sheet) => sum + Object.keys(sheet.cells).length, 0);
  const formulaCells = document.sheets.reduce(
    (sum, sheet) => sum + Object.values(sheet.cells).filter((cell) => cell.formula).length,
    0,
  );

  return (
    <aside className="workbook-nav">
      <div className="navigator-tabs" role="tablist" aria-label="工作簿导航">
        <button className={activeTab === "sheets" ? "active" : ""} onClick={() => onActiveTabChange("sheets")}><Table /> 目录</button>
        <button className={activeTab === "templates" ? "active" : ""} onClick={() => onActiveTabChange("templates")}><GridFour /> 模板</button>
      </div>

      {activeTab === "sheets" ? (
        <>
          <div className="navigator-section-heading">
            <span>工作表</span>
            <button className="icon-button" onClick={onAddSheet} aria-label="添加工作表"><Plus /></button>
          </div>
          <div className="sheet-list">
            {document.sheets.map((sheet, index) => (
              <button key={sheet.id} className={sheet.id === document.activeSheetId ? "sheet-item active" : "sheet-item"}>
                <span className="sheet-index">{String(index + 1).padStart(2, "0")}</span>
                <span><b>{sheet.name}</b><small>{Object.keys(sheet.cells).length} 个单元格</small></span>
                <CaretRight />
              </button>
            ))}
          </div>

          <div className="model-summary">
            <span><FileXls /> 模型概览</span>
            <dl>
              <div><dt>工作表</dt><dd>{document.sheets.length}</dd></div>
              <div><dt>有效单元格</dt><dd>{populatedCells}</dd></div>
              <div><dt>公式</dt><dd>{formulaCells}</dd></div>
            </dl>
          </div>

          <button className="schema-entry" onClick={onShowSchema}>
            <BracketsCurly />
            <span><b>Schema 代码</b><small>查看并复制当前模型</small></span>
            <CaretRight />
          </button>
        </>
      ) : (
        <div className="template-list">
          <p>选择一个经过验证的结构，再交给 AI 调整。</p>
          {workbookTemplates.map((template) => (
            <button key={template.id} onClick={() => onTemplate(template.create)}>
              <span className={`template-art template-${template.id}`}>
                {Array.from({ length: 12 }).map((_, index) => <i key={index} />)}
              </span>
              <span><b>{template.title}</b><small>{template.description}</small></span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
