import { AnthropicLlm, type AiUsageEvent, type LlmClient } from "@devoirs/ai";
import { collections } from "@devoirs/db";
import { ObjectId } from "mongodb";
import { HttpError } from "../http";
import { DemoLlm, demoAiEnabled } from "./fake-llm";

/** Budget IA quotidien en dollars (variable AI_DAILY_BUDGET_USD, 5 $ par défaut). */
export function dailyBudgetUsd(): number {
  const v = Number(process.env.AI_DAILY_BUDGET_USD);
  return Number.isFinite(v) && v > 0 ? v : 5;
}

export async function logAiUsage(e: AiUsageEvent): Promise<void> {
  try {
    await collections().aiUsage.insertOne({ _id: new ObjectId(), ...e, createdAt: new Date() });
  } catch (err) {
    console.error("[ai] journalisation du coût impossible", err instanceof Error ? err.message : err);
  }
}

function startOfDayUtc(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function spentTodayUsd(): Promise<number> {
  const [row] = await collections()
    .aiUsage.aggregate<{ total: number }>([
      { $match: { createdAt: { $gte: startOfDayUtc() } } },
      { $group: { _id: null, total: { $sum: "$costMicroUsd" } } },
    ])
    .toArray();
  return (row?.total ?? 0) / 1_000_000;
}

export interface CostRow {
  day: string;
  feature: string;
  calls: number;
  failures: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export async function costsByDay(days = 14): Promise<CostRow[]> {
  const since = new Date(startOfDayUtc().getTime() - (days - 1) * 86_400_000);
  const rows = await collections()
    .aiUsage.aggregate<{
      _id: { day: string; feature: string };
      calls: number;
      failures: number;
      inputTokens: number;
      outputTokens: number;
      cost: number;
    }>([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, feature: "$feature" },
          calls: { $sum: 1 },
          failures: { $sum: { $cond: ["$ok", 0, 1] } },
          inputTokens: { $sum: { $add: ["$inputTokens", "$cacheReadTokens", "$cacheCreationTokens"] } },
          outputTokens: { $sum: "$outputTokens" },
          cost: { $sum: "$costMicroUsd" },
        },
      },
      { $sort: { "_id.day": -1, "_id.feature": 1 } },
    ])
    .toArray();
  return rows.map((r) => ({
    day: r._id.day,
    feature: r._id.feature,
    calls: r.calls,
    failures: r.failures,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    costUsd: r.cost / 1_000_000,
  }));
}

let llmOverride: LlmClient | null = null;
/** Pour les tests : remplace le vrai client par un faux. */
export function setLlmForTests(llm: LlmClient | null): void {
  llmOverride = llm;
}

/** Client IA prêt à l'emploi, ou erreur claire si la clé manque ou si le budget du jour est atteint. */
export async function getLlm(): Promise<LlmClient> {
  if (llmOverride) return llmOverride;
  if (demoAiEnabled()) return new DemoLlm();
  if (!process.env.ANTHROPIC_API_KEY) throw new HttpError(503, "AI_NOT_CONFIGURED", "admin.aiNotConfigured");
  if ((await spentTodayUsd()) >= dailyBudgetUsd())
    throw new HttpError(429, "AI_BUDGET_EXCEEDED", "admin.aiBudgetExceeded");
  return new AnthropicLlm(logAiUsage);
}
