import { NextResponse } from "next/server";
import { modelSettingsSchema } from "@/lib/model-settings";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const settings = modelSettingsSchema.parse(await request.json());
    const key = settings.apiKey || process.env.VIBE_EXCEL_API_KEY;
    if (!key) return NextResponse.json({ ok: false, error: "API Key is required" }, { status: 400 });
    const startedAt = Date.now();
    const base = settings.baseUrl.replace(/\/+$/, "");
    let url = `${base}/models`;
    const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
    if (settings.provider === "anthropic") {
      url = `${base}/models`;
      delete headers.Authorization;
      headers["x-api-key"] = key;
      headers["anthropic-version"] = "2023-06-01";
    } else if (settings.provider === "google") {
      url = `${base}/models?key=${encodeURIComponent(key)}`;
      delete headers.Authorization;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch(url, { headers, signal: controller.signal, cache: "no-store" });
    clearTimeout(timeout);
    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({
        ok: false,
        status: response.status,
        latencyMs: Date.now() - startedAt,
        error: text.slice(0, 500) || response.statusText,
      });
    }
    return NextResponse.json({ ok: true, status: response.status, latencyMs: Date.now() - startedAt });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
