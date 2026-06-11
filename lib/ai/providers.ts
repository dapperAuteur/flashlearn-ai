import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import { type ApiKeyType } from '@/types/api';

/**
 * Provider abstraction for all AI features.
 *
 * Every AI feature in the app goes through this module instead of talking to a
 * provider SDK directly. Switch the active provider with the LLM_PROVIDER env var
 * (default: cerebras). Cerebras/OpenRouter/Mistral/Together expose OpenAI-compatible
 * chat APIs, so one client drives any of them by swapping the base URL. Gemini is a
 * first-class option too, routed through the Google provider.
 *
 * Env vars:
 *   LLM_PROVIDER         active text provider (cerebras | openrouter | mistral | together | gemini)
 *   LLM_TEXT_MODEL       optional model-id override for the text provider
 *   LLM_VISION_PROVIDER  provider used for image input (default: mistral, since text-only
 *                        providers like Cerebras can't accept images)
 *   LLM_VISION_MODEL     optional model-id override for the vision provider
 */

export type ProviderName = 'cerebras' | 'openrouter' | 'mistral' | 'together' | 'gemini';

interface ProviderConfig {
  kind: 'openai-compatible' | 'google';
  baseURL?: string;
  apiKey: string | undefined;
  /** Default text model id when LLM_TEXT_MODEL is unset. */
  text: string;
  /** Default vision model id when LLM_VISION_MODEL is unset. Omitted for text-only providers. */
  vision?: string;
}

const REGISTRY: Record<ProviderName, ProviderConfig> = {
  cerebras: {
    kind: 'openai-compatible',
    baseURL: 'https://api.cerebras.ai/v1',
    apiKey: process.env.CEREBRAS_API_KEY,
    text: 'llama-3.3-70b',
    // No vision: Cerebras serves text-only Llama models.
  },
  openrouter: {
    kind: 'openai-compatible',
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    text: 'meta-llama/llama-3.3-70b-instruct',
    vision: 'mistralai/pixtral-12b',
  },
  mistral: {
    kind: 'openai-compatible',
    baseURL: 'https://api.mistral.ai/v1',
    apiKey: process.env.MISTRAL_API_KEY,
    text: 'mistral-large-latest',
    vision: 'pixtral-12b-2409',
  },
  together: {
    kind: 'openai-compatible',
    baseURL: 'https://api.together.xyz/v1',
    apiKey: process.env.TOGETHER_API_KEY,
    text: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    vision: 'meta-llama/Llama-Vision-Free',
  },
  gemini: {
    kind: 'google',
    apiKey: process.env.GEMINI_API_KEY,
    text: process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash',
    vision: process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash',
  },
};

const DEFAULT_TEXT_PROVIDER = normalizeProvider(process.env.LLM_PROVIDER, 'cerebras');
const DEFAULT_VISION_PROVIDER = normalizeProvider(process.env.LLM_VISION_PROVIDER, 'mistral');

function normalizeProvider(value: string | undefined, fallback: ProviderName): ProviderName {
  const v = (value || '').trim().toLowerCase();
  if (v && v in REGISTRY) return v as ProviderName;
  return fallback;
}

function buildModel(provider: ProviderName, modelId: string): LanguageModel {
  const cfg = REGISTRY[provider];
  if (!cfg) throw new Error(`Unknown LLM provider "${provider}".`);
  if (!cfg.apiKey) {
    throw new Error(
      `Missing API key for LLM provider "${provider}". Set the matching *_API_KEY env var.`,
    );
  }
  if (cfg.kind === 'google') {
    const google = createGoogleGenerativeAI({ apiKey: cfg.apiKey });
    return google(modelId);
  }
  const client = createOpenAICompatible({
    name: provider,
    baseURL: cfg.baseURL!,
    apiKey: cfg.apiKey,
  });
  return client(modelId);
}

/**
 * Language model for text-only features (flashcards from topic/PDF/YouTube, answer
 * evaluation, distractors, RAG, banners). `keyType` is accepted for interface parity
 * with the old per-tier Gemini keying and as a hook for future per-tier model routing;
 * it does not currently change the model.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getTextModel(_keyType?: ApiKeyType): LanguageModel {
  const provider = DEFAULT_TEXT_PROVIDER;
  const modelId = process.env.LLM_TEXT_MODEL || REGISTRY[provider].text;
  return buildModel(provider, modelId);
}

/**
 * Vision-capable language model for image input. Uses LLM_VISION_PROVIDER (default
 * mistral / Pixtral) independently of the text provider, so a Cerebras-default
 * deployment still has a working image path.
 */
export function getVisionModel(): LanguageModel {
  const provider = DEFAULT_VISION_PROVIDER;
  const cfg = REGISTRY[provider];
  const modelId = process.env.LLM_VISION_MODEL || cfg.vision || cfg.text;
  return buildModel(provider, modelId);
}

/** The active text provider name (useful for logging/diagnostics). */
export const activeTextProvider = DEFAULT_TEXT_PROVIDER;
export const activeVisionProvider = DEFAULT_VISION_PROVIDER;
