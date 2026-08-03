"use client";

import { useState } from "react";
import { Check, Eye, EyeSlash, X } from "@phosphor-icons/react";
import { providerDefaults, type ModelSettings } from "@/lib/model-settings";
import { useStudioI18n } from "@/components/studio/StudioI18n";

interface ModelSettingsDialogProps {
  value: ModelSettings;
  onChange: (settings: ModelSettings) => void;
  onClose: () => void;
}

export function ModelSettingsDialog({ value, onChange, onClose }: ModelSettingsDialogProps) {
  const { t } = useStudioI18n();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
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
      const response = await fetch(`${basePath}/api/ai/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = await response.json() as { ok?: boolean; latencyMs?: number; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || t("settings.connectionFailed"));
      setTestState("success");
      setTestMessage(t("settings.connectionSuccess", { latency: result.latencyMs ?? 0 }));
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
          <div><h2 id="model-settings-title">{t("settings.title")}</h2><p>{t("settings.description")}</p></div>
          <button className="icon-button" onClick={onClose} aria-label={t("settings.close")}><X /></button>
        </header>
        <div className="settings-form">
          <label>
            <span>{t("settings.provider")}</span>
            <select
              value={draft.provider}
              onChange={(event) => {
                const provider = event.target.value as ModelSettings["provider"];
                setDraft((current) => ({ ...current, provider, ...providerDefaults[provider] }));
              }}
            >
              <option value="openai-compatible">{t("settings.openai")}</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google Gemini</option>
            </select>
          </label>
          <label>
            <span>{t("settings.baseUrl")}</span>
            <input value={draft.baseUrl} onChange={(event) => update("baseUrl", event.target.value)} spellCheck={false} />
            <small>{t("settings.baseUrlHelp")}</small>
          </label>
          <label>
            <span>{t("settings.model")}</span>
            <input value={draft.model} onChange={(event) => update("model", event.target.value)} placeholder={t("settings.modelPlaceholder")} spellCheck={false} />
          </label>
          <label>
            <span>{t("settings.apiKey")}</span>
            <div className="secret-input">
              <input type={showKey ? "text" : "password"} value={draft.apiKey} onChange={(event) => update("apiKey", event.target.value)} autoComplete="off" spellCheck={false} />
              <button onClick={() => setShowKey((current) => !current)} aria-label={showKey ? t("settings.hideKey") : t("settings.showKey")}>{showKey ? <EyeSlash /> : <Eye />}</button>
            </div>
          </label>
          <label>
            <span>{t("settings.temperature", { value: draft.temperature.toFixed(1) })}</span>
            <input type="range" min="0" max="1" step="0.1" value={draft.temperature} onChange={(event) => update("temperature", Number(event.target.value))} />
            <small>{t("settings.temperatureHelp")}</small>
          </label>
        </div>
        {testMessage && <p className={`connection-result ${testState}`}><Check /> {testMessage}</p>}
        <footer>
          <button className="button button-secondary" onClick={testConnection} disabled={testState === "testing"}>{testState === "testing" ? t("settings.testing") : t("settings.test")}</button>
          <button className="button button-primary" onClick={save}>{t("settings.save")}</button>
        </footer>
      </section>
    </div>
  );
}
