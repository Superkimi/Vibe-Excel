"use client";

import { useState } from "react";
import { Check, Eye, EyeSlash, X } from "@phosphor-icons/react";
import { providerDefaults, type ModelSettings } from "@/lib/model-settings";

interface ModelSettingsDialogProps {
  value: ModelSettings;
  onChange: (settings: ModelSettings) => void;
  onClose: () => void;
}

export function ModelSettingsDialog({ value, onChange, onClose }: ModelSettingsDialogProps) {
  const [draft, setDraft] = useState(value);
  const [showKey, setShowKey] = useState(false);
  const [testState, setTestState] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const update = <Key extends keyof ModelSettings>(key: Key, next: ModelSettings[Key]) => {
    setDraft((current) => ({ ...current, [key]: next }));
    setTestState("idle");
  };

  const testConnection = async () => {
    setTestState("testing");
    setTestMessage("");
    try {
      const response = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = await response.json() as { ok?: boolean; latencyMs?: number; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "连接失败");
      setTestState("success");
      setTestMessage(`连接成功，${result.latencyMs ?? 0} ms`);
    } catch (error) {
      setTestState("error");
      setTestMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const save = () => {
    onChange(draft);
    onClose();
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="model-settings-title">
        <header>
          <div><h2 id="model-settings-title">模型连接</h2><p>配置只保存在当前浏览器。Key 不会写入仓库。</p></div>
          <button className="icon-button" onClick={onClose} aria-label="关闭"><X /></button>
        </header>
        <div className="settings-form">
          <label>
            <span>服务类型</span>
            <select
              value={draft.provider}
              onChange={(event) => {
                const provider = event.target.value as ModelSettings["provider"];
                setDraft((current) => ({ ...current, provider, ...providerDefaults[provider] }));
              }}
            >
              <option value="openai-compatible">OpenAI 兼容接口</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google Gemini</option>
            </select>
          </label>
          <label>
            <span>Base URL</span>
            <input value={draft.baseUrl} onChange={(event) => update("baseUrl", event.target.value)} spellCheck={false} />
            <small>支持 OpenRouter、DeepSeek、Moonshot 和本地兼容网关。</small>
          </label>
          <label>
            <span>模型名称</span>
            <input value={draft.model} onChange={(event) => update("model", event.target.value)} placeholder="例如 gpt-5.4" spellCheck={false} />
          </label>
          <label>
            <span>API Key</span>
            <div className="secret-input">
              <input type={showKey ? "text" : "password"} value={draft.apiKey} onChange={(event) => update("apiKey", event.target.value)} autoComplete="off" spellCheck={false} />
              <button onClick={() => setShowKey((current) => !current)} aria-label={showKey ? "隐藏 Key" : "显示 Key"}>{showKey ? <EyeSlash /> : <Eye />}</button>
            </div>
          </label>
          <label>
            <span>创造性 <b>{draft.temperature.toFixed(1)}</b></span>
            <input type="range" min="0" max="1" step="0.1" value={draft.temperature} onChange={(event) => update("temperature", Number(event.target.value))} />
            <small>表格建模建议保持在 0.0-0.3，减少公式和结构漂移。</small>
          </label>
        </div>
        {testMessage && <p className={`connection-result ${testState}`}><Check /> {testMessage}</p>}
        <footer>
          <button className="button button-secondary" onClick={testConnection} disabled={testState === "testing"}>{testState === "testing" ? "正在测试" : "测试连接"}</button>
          <button className="button button-primary" onClick={save}>保存配置</button>
        </footer>
      </section>
    </div>
  );
}
