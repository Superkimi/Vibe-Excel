"use client";

import { useMemo, useState } from "react";
import {
  ArrowUp,
  CheckCircle,
  GearSix,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";
import { SpatialAgent } from "@/components/studio/SpatialAgent";
import { applyWorkbookOperations } from "@/lib/workbook-operations";
import { aiWorkbookResponseSchema, type AiWorkbookResponse, type WorkbookDocument } from "@/lib/workbook-schema";
import type { ModelSettings } from "@/lib/model-settings";

interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  result?: AiWorkbookResponse;
  error?: boolean;
}

interface AiPanelProps {
  document: WorkbookDocument;
  settings: ModelSettings;
  onSettings: () => void;
  onApply: (document: WorkbookDocument, summary: string) => void;
}

const suggestions = [
  "根据当前数据补齐季度汇总和利润公式",
  "统一标题样式、数字格式和列宽",
  "创建一个清晰的项目跟踪模型",
];

function operationLabel(operation: AiWorkbookResponse["operations"][number]): string {
  const labels: Record<string, string> = {
    set_cells: "写入单元格",
    clear_range: "清空范围",
    patch_range: "调整范围",
    add_sheet: "添加工作表",
    delete_sheet: "删除工作表",
    rename_sheet: "重命名",
    resize_columns: "调整列宽",
    resize_rows: "调整行高",
    set_freeze: "设置冻结",
    merge_cells: "合并单元格",
    unmerge_cells: "取消合并",
    set_theme: "更新主题",
    set_title: "更新标题",
    replace_workbook: "重建模型",
  };
  return labels[operation.op] ?? operation.op;
}

export function AiPanel({ document, settings, onSettings, onApply }: AiPanelProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [state, setState] = useState<"idle" | "thinking" | "applying" | "done" | "error">("idle");
  const configured = Boolean(settings.model && settings.apiKey);
  const formulaCount = useMemo(
    () => document.sheets.reduce((sum, sheet) => sum + Object.values(sheet.cells).filter((cell) => cell.formula).length, 0),
    [document],
  );

  const send = async (input = prompt) => {
    const cleanPrompt = input.trim();
    if (!cleanPrompt || state === "thinking" || state === "applying") return;
    if (!configured) {
      onSettings();
      return;
    }
    const userMessage: ConversationMessage = { id: crypto.randomUUID(), role: "user", content: cleanPrompt };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setPrompt("");
    setState("thinking");
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: cleanPrompt,
          workbook: document,
          settings,
          history: messages.slice(-8).map(({ role, content }) => ({ role, content })),
        }),
      });
      const body = await response.json() as unknown;
      if (!response.ok) {
        const detail = typeof body === "object" && body && "error" in body ? String(body.error) : "模型请求失败";
        throw new Error(detail);
      }
      const result = aiWorkbookResponseSchema.parse(body);
      setState("applying");
      const nextDocument = applyWorkbookOperations(document, result.operations);
      onApply(nextDocument, result.summary);
      setMessages([...nextMessages, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.assistantMessage,
        result,
      }]);
      setState("done");
      setTimeout(() => setState("idle"), 2_000);
    } catch (error) {
      setMessages([...nextMessages, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: error instanceof Error ? error.message : String(error),
        error: true,
      }]);
      setState("error");
    }
  };

  return (
    <aside className="ai-panel">
      <header className="ai-panel-header">
        <div><span className="ai-title-icon"><Sparkle weight="fill" /></span><span><b>Vibe AI</b><small>{settings.model || "尚未连接模型"}</small></span></div>
        <button className="icon-button" onClick={onSettings} aria-label="模型设置"><GearSix /></button>
      </header>

      <div className="ai-conversation">
        {messages.length === 0 ? (
          <div className="ai-empty">
            <SpatialAgent state={state} />
            <h2>想把这张表变成什么？</h2>
            <p>描述目标、受众和已有假设。Vibe AI 会先生成操作，再写入模型。</p>
            <div className="model-context">
              <span>{document.sheets.length} 张工作表</span>
              <span>{formulaCount} 个公式</span>
              <span>{document.title}</span>
            </div>
            <div className="suggestion-list">
              {suggestions.map((suggestion) => <button key={suggestion} onClick={() => send(suggestion)}>{suggestion}</button>)}
            </div>
          </div>
        ) : (
          <div className="message-list" aria-live="polite">
            {messages.map((message) => (
              <article key={message.id} className={`chat-message ${message.role} ${message.error ? "error" : ""}`}>
                <span>{message.role === "assistant" ? "Vibe AI" : "你"}</span>
                <p>{message.content}</p>
                {message.result && (
                  <div className="change-card">
                    <header><CheckCircle weight="fill" /> 已应用 {message.result.operations.length} 项修改</header>
                    <div>{message.result.operations.slice(0, 5).map((operation, index) => <span key={`${operation.op}-${index}`}>{operationLabel(operation)}</span>)}</div>
                    {message.result.qualityChecks.length > 0 && <small>{message.result.qualityChecks.join("；")}</small>}
                  </div>
                )}
                {message.error && <span className="error-label"><WarningCircle /> 请求未写入工作簿</span>}
              </article>
            ))}
            {(state === "thinking" || state === "applying") && (
              <article className="chat-message assistant pending"><SpatialAgent state={state} /></article>
            )}
          </div>
        )}
      </div>

      <div className="ai-composer">
        {!configured && <button className="configure-banner" onClick={onSettings}><GearSix /> 配置模型后开始对话</button>}
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder="例如：做一个 12 个月现金流模型，并标出资金缺口"
          rows={3}
          disabled={state === "thinking" || state === "applying"}
        />
        <footer>
          <span>Enter 发送，Shift + Enter 换行</span>
          <button onClick={() => send()} disabled={!prompt.trim() || state === "thinking" || state === "applying"} aria-label="发送"><ArrowUp weight="bold" /></button>
        </footer>
      </div>
    </aside>
  );
}
