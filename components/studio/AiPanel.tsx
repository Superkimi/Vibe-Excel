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
import { useStudioI18n, type StudioMessageKey } from "@/components/studio/StudioI18n";
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

const suggestionKeys = ["ai.suggestion.budget", "ai.suggestion.style", "ai.suggestion.project"] as const;

function operationLabel(operation: AiWorkbookResponse["operations"][number], translate: (key: StudioMessageKey) => string): string {
  const key = `ai.operation.${operation.op}` as StudioMessageKey;
  return translate(key);
}

export function AiPanel({ document, settings, onSettings, onApply }: AiPanelProps) {
  const { t } = useStudioI18n();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
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
      const response = await fetch(`${basePath}/api/ai`, {
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
        const detail = typeof body === "object" && body && "error" in body ? String(body.error) : t("ai.requestFailed");
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
        <div><span className="ai-title-icon"><Sparkle weight="fill" /></span><span><b>Vibe AI</b><small>{settings.model || t("ai.notConnected")}</small></span></div>
        <button className="icon-button" onClick={onSettings} aria-label={t("ai.settings")}><GearSix /></button>
      </header>

      <div className="ai-conversation">
        {messages.length === 0 ? (
          <div className="ai-empty">
            <SpatialAgent state={state} />
            <h2>{t("ai.emptyTitle")}</h2>
            <p>{t("ai.emptyDescription")}</p>
            <div className="model-context">
              <span>{t("ai.sheetCount", { count: document.sheets.length })}</span>
              <span>{t("ai.formulaCount", { count: formulaCount })}</span>
              <span>{document.title}</span>
            </div>
            <div className="suggestion-list">
              {suggestionKeys.map((key) => <button key={key} onClick={() => send(t(key))}>{t(key)}</button>)}
            </div>
          </div>
        ) : (
          <div className="message-list" aria-live="polite">
            {messages.map((message) => (
              <article key={message.id} className={`chat-message ${message.role} ${message.error ? "error" : ""}`}>
                <span>{message.role === "assistant" ? "Vibe AI" : t("ai.user")}</span>
                <p>{message.content}</p>
                {message.result && (
                  <div className="change-card">
                    <header><CheckCircle weight="fill" /> {t("ai.applied", { count: message.result.operations.length })}</header>
                    <div>{message.result.operations.slice(0, 5).map((operation, index) => <span key={`${operation.op}-${index}`}>{operationLabel(operation, t)}</span>)}</div>
                    {message.result.qualityChecks.length > 0 && <small>{message.result.qualityChecks.join("；")}</small>}
                  </div>
                )}
                {message.error && <span className="error-label"><WarningCircle /> {t("ai.requestNotWritten")}</span>}
              </article>
            ))}
            {(state === "thinking" || state === "applying") && (
              <article className="chat-message assistant pending"><SpatialAgent state={state} /></article>
            )}
          </div>
        )}
      </div>

      <div className="ai-composer">
        {!configured && <button className="configure-banner" onClick={onSettings}><GearSix /> {t("ai.configure")}</button>}
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder={t("ai.prompt")}
          rows={3}
          disabled={state === "thinking" || state === "applying"}
        />
        <footer>
          <span>{t("ai.sendHint")}</span>
          <button onClick={() => send()} disabled={!prompt.trim() || state === "thinking" || state === "applying"} aria-label={t("ai.send")}><ArrowUp weight="bold" /></button>
        </footer>
      </div>
    </aside>
  );
}
