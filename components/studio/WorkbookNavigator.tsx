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
import { useStudioI18n } from "@/components/studio/StudioI18n";
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
  const { t } = useStudioI18n();
  const populatedCells = document.sheets.reduce((sum, sheet) => sum + Object.keys(sheet.cells).length, 0);
  const formulaCells = document.sheets.reduce(
    (sum, sheet) => sum + Object.values(sheet.cells).filter((cell) => cell.formula).length,
    0,
  );

  return (
    <aside className="workbook-nav">
      <div className="navigator-tabs" role="tablist" aria-label={t("nav.aria")}>
        <button className={activeTab === "sheets" ? "active" : ""} onClick={() => onActiveTabChange("sheets")}><Table /> {t("nav.sheets")}</button>
        <button className={activeTab === "templates" ? "active" : ""} onClick={() => onActiveTabChange("templates")}><GridFour /> {t("nav.templates")}</button>
      </div>

      {activeTab === "sheets" ? (
        <>
          <div className="navigator-section-heading">
            <span>{t("nav.worksheets")}</span>
            <button className="icon-button" onClick={onAddSheet} aria-label={t("nav.addSheet")}><Plus /></button>
          </div>
          <div className="sheet-list">
            {document.sheets.map((sheet, index) => (
              <button key={sheet.id} className={sheet.id === document.activeSheetId ? "sheet-item active" : "sheet-item"}>
                <span className="sheet-index">{String(index + 1).padStart(2, "0")}</span>
                <span><b>{sheet.name}</b><small>{t("nav.sheetCells", { count: Object.keys(sheet.cells).length })}</small></span>
                <CaretRight />
              </button>
            ))}
          </div>

          <div className="model-summary">
            <span><FileXls /> {t("nav.modelOverview")}</span>
            <dl>
              <div><dt>{t("nav.worksheets")}</dt><dd>{document.sheets.length}</dd></div>
              <div><dt>{t("nav.effectiveCells")}</dt><dd>{populatedCells}</dd></div>
              <div><dt>{t("nav.formulas")}</dt><dd>{formulaCells}</dd></div>
            </dl>
          </div>

          <button className="schema-entry" onClick={onShowSchema}>
            <BracketsCurly />
            <span><b>{t("nav.schema")}</b><small>{t("nav.schemaHelp")}</small></span>
            <CaretRight />
          </button>
        </>
      ) : (
        <div className="template-list">
          <p>{t("nav.templatesHelp")}</p>
          {workbookTemplates.map((template) => (
            <button key={template.id} onClick={() => onTemplate(template.create)}>
              <span className={`template-art template-${template.id}`}>
                {Array.from({ length: 12 }).map((_, index) => <i key={index} />)}
              </span>
              <span><b>{t(`template.${template.id}.title` as "template.blank.title" | "template.budget.title" | "template.project.title")}</b><small>{t(`template.${template.id}.description` as "template.blank.description" | "template.budget.description" | "template.project.description")}</small></span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
