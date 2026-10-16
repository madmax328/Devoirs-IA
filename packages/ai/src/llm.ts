import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { estimateCostMicroUsd, supportsServerFallback, type TokenUsage } from "./models";

export type AiFeature =
  | "EXERCISE_GEN"
  | "EXERCISE_REVIEW"
  | "HOMEWORK_VISION"
  | "HOMEWORK_COACH"
  | "CLASSIFY"
  | "SHORT_ANSWER_GRADING"
  | "PARENT_EXPLAIN"
  | "WEEKLY_REPORT"
  | "MODERATION";

/** Journal d'un appel : aucune donnée personnelle, uniquement des compteurs. */
export interface AiUsageEvent extends TokenUsage {
  feature: AiFeature;
  model: string;
  promptVersion: string;
  costMicroUsd: number;
  latencyMs: number;
  ok: boolean;
  stopReason: string | null;
}

export interface StructuredRequest<T> {
  feature: AiFeature;
  model: string;
  promptVersion: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  effort: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens?: number;
}

export interface StructuredResult<T> {
  /** null si le modèle a refusé ou si la sortie n'a pas pu être validée. */
  data: T | null;
  stopReason: string | null;
}

/** Abstraction du fournisseur : permet de tester toute la logique sans appeler l'API. */
export interface LlmClient {
  structured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>>;
}

export type UsageSink = (event: AiUsageEvent) => void | Promise<void>;

export class AnthropicLlm implements LlmClient {
  private readonly client: Anthropic;

  constructor(
    private readonly onUsage: UsageSink = () => undefined,
    client?: Anthropic,
  ) {
    // Clé lue dans ANTHROPIC_API_KEY.
    this.client = client ?? new Anthropic();
  }

  async structured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
    const started = Date.now();
    const fallback = supportsServerFallback(req.model);
    let usage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 };
    let stopReason: string | null = null;
    let ok = false;
    try {
      const message = await this.client.beta.messages.parse({
        model: req.model,
        max_tokens: req.maxTokens ?? 16000,
        // Le prompt système est stable : on le met en cache.
        system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: req.user }],
        output_config: { effort: req.effort, format: betaZodOutputFormat(req.schema) },
        ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      });
      stopReason = message.stop_reason;
      usage = {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
        cacheCreationTokens: message.usage.cache_creation_input_tokens ?? 0,
      };
      if (message.stop_reason === "refusal") return { data: null, stopReason };
      ok = message.parsed_output !== null;
      return { data: (message.parsed_output as T | null) ?? null, stopReason };
    } finally {
      await this.onUsage({
        feature: req.feature,
        model: req.model,
        promptVersion: req.promptVersion,
        ...usage,
        costMicroUsd: estimateCostMicroUsd(req.model, usage),
        latencyMs: Date.now() - started,
        ok,
        stopReason,
      });
    }
  }
}
