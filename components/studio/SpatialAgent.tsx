"use client";

import { useStudioI18n } from "@/components/studio/StudioI18n";

interface SpatialAgentProps {
  state: "idle" | "thinking" | "applying" | "done" | "error";
}

export function SpatialAgent({ state }: SpatialAgentProps) {
  const { t } = useStudioI18n();

  return (
    <div className={`spatial-agent state-${state}`} aria-hidden="true">
      <div className="agent-scene">
        <span className="agent-sheet sheet-a" />
        <span className="agent-sheet sheet-b" />
        <span className="agent-sheet sheet-c" />
        <span className="agent-core"><i /></span>
      </div>
      <span className="agent-state-label">
        {state === "thinking" ? t("agent.thinking") : state === "applying" ? t("agent.applying") : state === "done" ? t("agent.done") : state === "error" ? t("agent.error") : t("agent.idle")}
      </span>
    </div>
  );
}
