import { NextResponse } from "next/server";
import { EXCEL_SYSTEM_PROMPT, createWorkbookContext } from "@/lib/ai-prompt";
import { modelSettingsSchema } from "@/lib/model-settings";
import {
  aiWorkbookResponseSchema,
  workbookSchema,
  type AiWorkbookResponse,
} from "@/lib/workbook-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUEST_LIMIT = 2_000_000;
const MODEL_TIMEOUT_MS = 60_000;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function getTextFromJson(raw: unknown, provider: string): string {
  if (provider === "anthropic") {
    const content = (raw as { content?: Array<{ type?: string; text?: string }> }).content;
    return content?.filter((block) => block.type === "text").map((block) => block.text ?? "").join("") ?? "";
  }
  if (provider === "google") {
    return (raw as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
      .candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  }
  return (raw as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content ?? "";
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Model response did not contain a JSON object");
  return JSON.parse(trimmed.slice(start, end + 1));
}

async function callModel(
  settings: ReturnType<typeof modelSettingsSchema.parse>,
  messages: ChatMessage[],
  signal: AbortSignal,
): Promise<string> {
  const apiKey = settings.apiKey || process.env.VIBE_EXCEL_API_KEY || "";
  if (!apiKey) throw new Error("API Key is required");
  const baseUrl = settings.baseUrl.replace(/\/+$/, "");

  let url: string;
  let headers: Record<string, string> = { "Content-Type": "application/json" };
  let body: Record<string, unknown>;

  if (settings.provider === "anthropic") {
    url = `${baseUrl}/messages`;
    headers = {
      ...headers,
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };
    body = {
      model: settings.model,
      max_tokens: 8_000,
      temperature: settings.temperature,
      system: EXCEL_SYSTEM_PROMPT,
      messages,
    };
  } else if (settings.provider === "google") {
    url = `${baseUrl}/models/${encodeURIComponent(settings.model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    body = {
      systemInstruction: { parts: [{ text: EXCEL_SYSTEM_PROMPT }] },
      contents: messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      generationConfig: {
        temperature: settings.temperature,
        responseMimeType: "application/json",
        maxOutputTokens: 8_000,
      },
    };
  } else {
    url = `${baseUrl}/chat/completions`;
    headers.Authorization = `Bearer ${apiKey}`;
    body = {
      model: settings.model,
      temperature: settings.temperature,
      max_tokens: 8_000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXCEL_SYSTEM_PROMPT },
        ...messages,
      ],
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
    cache: "no-store",
  });
  const rawText = await response.text();
  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    raw = rawText;
  }
  if (!response.ok) {
    const providerMessage = typeof raw === "object" && raw && "error" in raw
      ? JSON.stringify(raw.error).slice(0, 800)
      : String(raw).slice(0, 800);
    throw new Error(`Model request failed (${response.status}): ${providerMessage}`);
  }
  return getTextFromJson(raw, settings.provider);
}

async function generateValidatedResponse(
  settings: ReturnType<typeof modelSettingsSchema.parse>,
  messages: ChatMessage[],
): Promise<AiWorkbookResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    let text = await callModel(settings, messages, controller.signal);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return aiWorkbookResponseSchema.parse(extractJson(text));
      } catch (error) {
        if (attempt === 1) throw error;
        text = await callModel(settings, [
          ...messages,
          { role: "assistant", content: text.slice(0, 24_000) },
          {
            role: "user",
            content: `Repair the previous JSON so it exactly matches the response schema. Validation error: ${String(error).slice(0, 2_000)}`,
          },
        ], controller.signal);
      }
    }
    throw new Error("Unable to validate model response");
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > REQUEST_LIMIT) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    const body = await request.json() as {
      prompt?: unknown;
      history?: unknown;
      workbook?: unknown;
      settings?: unknown;
    };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt || prompt.length > 12_000) {
      return NextResponse.json({ error: "Prompt must be between 1 and 12,000 characters" }, { status: 400 });
    }
    const workbook = workbookSchema.parse(body.workbook);
    const settings = modelSettingsSchema.parse(body.settings);
    if (!settings.model) {
      return NextResponse.json({ error: "Model name is required" }, { status: 400 });
    }
    const history = Array.isArray(body.history)
      ? body.history
          .slice(-8)
          .filter((message): message is ChatMessage => (
            typeof message === "object"
            && message !== null
            && (message as ChatMessage).role !== undefined
            && ["user", "assistant"].includes((message as ChatMessage).role)
            && typeof (message as ChatMessage).content === "string"
          ))
          .map((message) => ({ ...message, content: message.content.slice(0, 6_000) }))
      : [];
    const result = await generateValidatedResponse(settings, [
      ...history,
      {
        role: "user",
        content: `CURRENT WORKBOOK:\n${createWorkbookContext(workbook)}\n\nUSER REQUEST:\n${prompt}`,
      },
    ]);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("aborted") ? 504 : 500;
    return NextResponse.json({ error: message.slice(0, 1_500) }, { status });
  }
}
