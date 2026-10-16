/**
 * Choix des modèles (configurables par variables d'environnement).
 * - « strong » : lecture de photos, coaching, génération d'exercices.
 * - « fast »   : classification, relecture, correction de réponses courtes.
 */
export const MODELS = {
  strong: process.env.AI_MODEL_STRONG || "claude-opus-5-5",
  fast: process.env.AI_MODEL_FAST || "claude-haiku-5-5",
} as const;
export type ModelRole = keyof typeof MODELS;

/** Tarifs en dollars par million de jetons (entrée, sortie), pour estimer les coûts. */
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-fable-5-1": { input: 10, output: 50 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

/** Coût estimé en micro-dollars (lecture du cache ≈ 10 % du prix d'entrée, écriture ≈ 125 %). */
export function estimateCostMicroUsd(model: string, u: TokenUsage): number {
  const p = PRICING[model] ?? PRICING["claude-opus-5-5"]!;
  const dollars =
    (u.inputTokens * p.input +
      u.cacheReadTokens * p.input * 0.1 +
      u.cacheCreationTokens * p.input * 1.25 +
      u.outputTokens * p.output) /
    1_000_000;
  return Math.round(dollars * 1_000_000);
}

/** Les modèles qui acceptent la relance automatique côté serveur en cas de refus. */
export const supportsServerFallback = (model: string) => /^claude-(opus-5|fable-5|sonnet-5-5)/.test(model);
