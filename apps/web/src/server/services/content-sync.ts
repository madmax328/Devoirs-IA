import { collections, type ExerciseDoc, type NotionDoc } from "@devoirs/db";
import { fingerprint, referentiel, seedExercises, seedExercisesVersion } from "@devoirs/content";
import { cycleOf, type ExerciseContent } from "@devoirs/shared";
import { ObjectId, type AnyBulkWriteOperation } from "mongodb";

/** Difficulté initiale (1 à 5) → échelle Elo ; recalibrée ensuite avec les réponses des élèves. */
export const initialRating = (difficulty: number) => (difficulty - 3) * 200;

export function exerciseContentHash(c: ExerciseContent): string {
  return fingerprint(JSON.stringify([c.notionIds, c.statement, c.answer, c.hints, c.explanation]));
}

const META_REFERENTIEL = "referentiel.version";
const META_SEEDS = "seedExercises.version";

async function syncNotions(): Promise<number> {
  const c = collections();
  const ref = referentiel();
  const now = new Date();
  const ops: AnyBulkWriteOperation<NotionDoc>[] = ref.notions.map(({ id, ...rest }) => ({
    replaceOne: {
      filter: { _id: id },
      replacement: { ...rest, cycle: cycleOf(rest.level), archived: false, updatedAt: now },
      upsert: true,
    },
  }));
  await c.notions.bulkWrite(ops, { ordered: false });
  // Les notions retirées du dépôt sont archivées (jamais supprimées : des exercices peuvent y faire référence).
  await c.notions.updateMany(
    { _id: { $nin: ref.notions.map((n) => n.id) }, archived: false },
    { $set: { archived: true, updatedAt: now } },
  );
  return ref.notions.length;
}

async function syncSeedExercises(): Promise<number> {
  const c = collections();
  const now = new Date();
  let changed = 0;
  for (const { key, ...content } of seedExercises()) {
    const hash = exerciseContentHash(content);
    const existing = await c.exercises.findOne({ key }, { projection: { contentHash: 1 } });
    if (existing?.contentHash === hash) continue;
    changed += 1;
    if (existing) {
      // Contenu modifié dans le dépôt : il redevient « auto-validé » et doit être relu à nouveau.
      await c.exercises.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...content,
            type: content.answer.type,
            contentHash: hash,
            status: "AUTO_VALIDATED",
            rating: initialRating(content.difficulty),
            updatedAt: now,
          },
        },
      );
      await c.exerciseReviews.insertOne({
        _id: new ObjectId(),
        exerciseId: existing._id,
        reviewer: "repo",
        verdict: "AUTO_VALIDATED",
        notes: "Mis à jour depuis le dépôt",
        createdAt: now,
      });
    } else {
      const doc: ExerciseDoc = {
        _id: new ObjectId(),
        key,
        ...content,
        type: content.answer.type,
        status: "AUTO_VALIDATED",
        source: "REPO",
        contentHash: hash,
        rating: initialRating(content.difficulty),
        stats: { served: 0, correct: 0 },
        openReports: 0,
        genMeta: null,
        createdAt: now,
        updatedAt: now,
      };
      await c.exercises.insertOne(doc);
    }
  }
  return changed;
}

let running: Promise<SyncResult> | null = null;
export interface SyncResult {
  notionsSynced: number | null;
  seedExercisesChanged: number | null;
}

/**
 * Recopie le référentiel et les exercices du dépôt dans la base quand ils ont changé
 * (comparaison d'empreintes : ne fait rien la plupart du temps).
 */
export function ensureContentSynced(): Promise<SyncResult> {
  running ??= (async () => {
    const c = collections();
    const [refMeta, seedMeta] = await Promise.all([
      c.meta.findOne({ _id: META_REFERENTIEL }),
      c.meta.findOne({ _id: META_SEEDS }),
    ]);
    const result: SyncResult = { notionsSynced: null, seedExercisesChanged: null };
    const refVersion = referentiel().version;
    if (refMeta?.value !== refVersion) {
      result.notionsSynced = await syncNotions();
      await c.meta.updateOne(
        { _id: META_REFERENTIEL },
        { $set: { value: refVersion, updatedAt: new Date() } },
        { upsert: true },
      );
    }
    const seedVersion = seedExercisesVersion();
    if (seedMeta?.value !== seedVersion) {
      result.seedExercisesChanged = await syncSeedExercises();
      await c.meta.updateOne(
        { _id: META_SEEDS },
        { $set: { value: seedVersion, updatedAt: new Date() } },
        { upsert: true },
      );
    }
    return result;
  })().finally(() => {
    running = null;
  });
  return running;
}
