import { z } from "zod";

export const modelProviderSchema = z.enum(["openai-compatible", "anthropic", "google"]);

export const modelSettingsSchema = z.object({
  provider: modelProviderSchema,
  model: z.string().min(1).max(180),
  baseUrl: z.string().url().max(500),
  apiKey: z.string().max(1_000),
  temperature: z.number().min(0).max(1),
}).strict();

export type ModelSettings = z.infer<typeof modelSettingsSchema>;

export const defaultModelSettings: ModelSettings = {
  provider: "openai-compatible",
  model: "",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  temperature: 0.2,
};

export const providerDefaults: Record<ModelSettings["provider"], Pick<ModelSettings, "baseUrl">> = {
  "openai-compatible": { baseUrl: "https://api.openai.com/v1" },
  anthropic: { baseUrl: "https://api.anthropic.com/v1" },
  google: { baseUrl: "https://generativelanguage.googleapis.com/v1beta" },
};
