import { collections } from "@devoirs/db";
import { HttpError } from "../http";

/**
 * Limites quotidiennes par enfant (usage raisonnable, y compris en Premium) — configurables.
 * Les limites de l'offre gratuite (3 aides par semaine) arriveront avec les abonnements (jalon 8).
 */
export const LIMITS = {
  homeworkPerDay: () => Number(process.env.LIMIT_HOMEWORK_PER_DAY) || 10,
  messagesPerHomework: () => Number(process.env.LIMIT_MESSAGES_PER_HOMEWORK) || 60,
};

const day = () => new Date().toISOString().slice(0, 10);

/** Incrémente le compteur et refuse si la limite est dépassée. */
export async function consume(childId: string, feature: string, limit: number): Promise<void> {
  const _id = `${childId}:${feature}:${day()}`;
  const res = await collections().usageCounters.findOneAndUpdate(
    { _id },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 2 * 86_400_000) } },
    { upsert: true, returnDocument: "after" },
  );
  if ((res?.count ?? 0) > limit) {
    await collections().usageCounters.updateOne({ _id }, { $inc: { count: -1 } });
    throw new HttpError(429, "DAILY_LIMIT", "homework.dailyLimit");
  }
}
