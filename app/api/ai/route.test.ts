import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/ai/route";
import { createBudgetWorkbook } from "@/lib/starter-workbooks";

afterEach(() => {
  vi.restoreAllMocks();
});

function validModelResult() {
  return {
    assistantMessage: "已补充预算说明。",
    summary: "在预算表新增说明列",
    operations: [{
      op: "set_cells",
      sheetId: "budget",
      cells: {
        G1: { value: "说明", type: "string", style: { bold: true } },
      },
    }],
    qualityChecks: ["公式范围未改变"],
  };
}

describe("AI route", () => {
  it("validates a model response before returning operations", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(validModelResult()) } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const response = await POST(new Request("http://localhost/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "增加说明列",
        workbook: createBudgetWorkbook(),
        settings: {
          provider: "openai-compatible",
          model: "test-model",
          baseUrl: "https://example.com/v1",
          apiKey: "test-key",
          temperature: 0.2,
        },
      }),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.operations[0]).toMatchObject({ op: "set_cells", sheetId: "budget" });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("runs one repair attempt when the first response violates the schema", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: "{\"assistantMessage\":\"missing operations\"}" } }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(validModelResult()) } }],
      }), { status: 200 }));

    const response = await POST(new Request("http://localhost/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "增加说明列",
        workbook: createBudgetWorkbook(),
        settings: {
          provider: "openai-compatible",
          model: "test-model",
          baseUrl: "https://example.com/v1",
          apiKey: "test-key",
          temperature: 0.2,
        },
      }),
    }));

    expect(response.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
