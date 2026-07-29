"use client";

interface SpatialAgentProps {
  state: "idle" | "thinking" | "applying" | "done" | "error";
}

export function SpatialAgent({ state }: SpatialAgentProps) {
  return (
    <div className={`spatial-agent state-${state}`} aria-hidden="true">
      <div className="agent-scene">
        <span className="agent-sheet sheet-a" />
        <span className="agent-sheet sheet-b" />
        <span className="agent-sheet sheet-c" />
        <span className="agent-core"><i /></span>
      </div>
      <span className="agent-state-label">
        {state === "thinking" ? "理解模型" : state === "applying" ? "写入操作" : state === "done" ? "校验完成" : state === "error" ? "需要调整" : "准备建模"}
      </span>
    </div>
  );
}
