import { collections, type MasteryStateDoc } from "@devoirs/db";
import {
  INITIAL_MASTERY,
  attemptWeight,
  masteryStatus,
  updateMastery,
  type AttemptContext,
  type MasteryValue,
} from "@devoirs/pedagogy";
import type { MasteryStatus } from "@devoirs/shared";
import { ObjectId } from "mongodb";

async function current(childId: string, notionId: string): Promise<MasteryStateDoc | null> {
  return collections().masteryStates.findOne({ childId, notionId });
}

async function save(
  childId: string,
  notionId: string,
  value: MasteryValue,
  practiced: boolean,
): Promise<void> {
  const now = new Date();
  await collections().masteryStates.updateOne(
    { childId, notionId },
    {
      $set: {
        rating: value.rating,
        observations: value.observations,
        updatedAt: now,
        ...(practiced ? { lastPracticedAt: now } : {}),
      },
      $setOnInsert: {
        _id: new ObjectId(),
        nextReviewAt: null,
        ...(practiced ? {} : { lastPracticedAt: null }),
      },
    },
    { upsert: true },
  );
}

/**
 * Met à jour la maîtrise d'une notion après une réponse, ainsi que le score de l'exercice.
 * Renvoie le nouveau statut de la notion.
 */
export async function applyAttempt(input: {
  childId: string;
  notionId: string;
  exerciseId: ObjectId;
  exerciseRating: number;
  score: number;
  context: Exclude<AttemptContext, "inferred">;
  hintsUsed?: number;
}): Promise<MasteryStatus> {
  const before = (await current(input.childId, input.notionId)) ?? INITIAL_MASTERY;
  const weight = attemptWeight(input.context, input.hintsUsed ?? 0);
  const { child, exerciseRating } = updateMastery(before, input.exerciseRating, input.score, weight);
  await save(input.childId, input.notionId, child, true);
  await collections().exercises.updateOne(
    { _id: input.exerciseId },
    {
      $set: { rating: exerciseRating },
      $inc: { "stats.served": 1, "stats.correct": input.score >= 0.75 ? 1 : 0 },
    },
  );
  return masteryStatus(child);
}

/**
 * Réussir une notion est un indice que ses prérequis sont acquis :
 * on les crédite légèrement, seulement s'ils n'ont jamais été observés directement.
 */
export async function inferPrerequisites(childId: string, prerequisiteIds: string[]): Promise<void> {
  for (const notionId of prerequisiteIds) {
    const before = await current(childId, notionId);
    if (before && before.observations > 0) continue;
    const { child } = updateMastery(before ?? INITIAL_MASTERY, 0, 1, attemptWeight("inferred"));
    await save(childId, notionId, child, false);
  }
}

export async function masteryMap(childId: string): Promise<Map<string, MasteryStateDoc>> {
  const docs = await collections().masteryStates.find({ childId }).toArray();
  return new Map(docs.map((d) => [d.notionId, d]));
}
