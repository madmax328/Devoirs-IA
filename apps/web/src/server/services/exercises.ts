import { generateExercises, type PipelineResult } from "@devoirs/ai";
import { checkExercise, referentiel } from "@devoirs/content";
import { collections, type ExerciseDoc, type ExerciseReportDoc, type ExerciseReviewDoc } from "@devoirs/db";
import {
  EXERCISE_STATUSES,
  exerciseContentSchema,
  type ExerciseContent,
  type ExerciseReportInput,
  type ExerciseStatus,
} from "@devoirs/shared";
import { ObjectId, type Filter } from "mongodb";
import { HttpError, errors } from "../http";
import { getLlm } from "./ai";
import { audit } from "./audit";
import { ensureContentSynced, exerciseContentHash, initialRating } from "./content-sync";

function parseId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw errors.notFound();
  return new ObjectId(id);
}

export interface ExerciseFilter {
  status?: ExerciseStatus;
  notionId?: string;
  reported?: boolean;
  page?: number;
}

const PAGE_SIZE = 30;

export async function listExercises(
  f: ExerciseFilter,
): Promise<{ items: ExerciseDoc[]; total: number; pageSize: number }> {
  await ensureContentSynced();
  const filter: Filter<ExerciseDoc> = {};
  if (f.status && (EXERCISE_STATUSES as readonly string[]).includes(f.status)) filter.status = f.status;
  if (f.notionId) filter.notionIds = f.notionId;
  if (f.reported) filter.openReports = { $gt: 0 };
  const c = collections();
  const page = Math.max(0, f.page ?? 0);
  const [items, total] = await Promise.all([
    c.exercises
      .find(filter)
      .sort({ openReports: -1, updatedAt: -1 })
      .skip(page * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray(),
    c.exercises.countDocuments(filter),
  ]);
  return { items, total, pageSize: PAGE_SIZE };
}

export async function getExerciseDetail(
  id: string,
): Promise<{ exercise: ExerciseDoc; reviews: ExerciseReviewDoc[]; reports: ExerciseReportDoc[] }> {
  const c = collections();
  const _id = parseId(id);
  const exercise = await c.exercises.findOne({ _id });
  if (!exercise) throw errors.notFound();
  const [reviews, reports] = await Promise.all([
    c.exerciseReviews.find({ exerciseId: _id }).sort({ createdAt: -1 }).limit(50).toArray(),
    c.exerciseReports.find({ exerciseId: _id }).sort({ createdAt: -1 }).limit(50).toArray(),
  ]);
  return { exercise, reviews, reports };
}

export type ReviewDecision = "HUMAN_VALIDATED" | "REJECTED" | "DRAFT";

/** Décision humaine dans la file de validation. Valider ou rejeter clôt les signalements ouverts. */
export async function reviewExercise(
  adminId: string,
  id: string,
  verdict: ReviewDecision,
  notes: string | null,
): Promise<ExerciseDoc> {
  const c = collections();
  const _id = parseId(id);
  const now = new Date();
  const closeReports = verdict !== "DRAFT";
  const updated = await c.exercises.findOneAndUpdate(
    { _id },
    { $set: { status: verdict, updatedAt: now, ...(closeReports ? { openReports: 0 } : {}) } },
    { returnDocument: "after" },
  );
  if (!updated) throw errors.notFound();
  await c.exerciseReviews.insertOne({
    _id: new ObjectId(),
    exerciseId: _id,
    reviewer: adminId,
    verdict,
    notes: notes || null,
    createdAt: now,
  });
  if (closeReports)
    await c.exerciseReports.updateMany({ exerciseId: _id, resolvedAt: null }, { $set: { resolvedAt: now } });
  await audit(adminId, "exercise.review", "exercise", id, { verdict });
  return updated;
}

/** Correction du contenu par l'admin : mêmes vérifications que pour l'IA, puis validation humaine. */
export async function updateExerciseContent(adminId: string, id: string, raw: unknown): Promise<ExerciseDoc> {
  const content = exerciseContentSchema.parse(raw);
  const problems = checkExercise(content);
  if (problems.length > 0)
    throw new HttpError(400, "EXERCISE_INVALID", "admin.exerciseInvalid", { problems: problems.join(" ; ") });
  const c = collections();
  const _id = parseId(id);
  const now = new Date();
  const updated = await c.exercises.findOneAndUpdate(
    { _id },
    {
      $set: {
        ...content,
        type: content.answer.type,
        contentHash: exerciseContentHash(content),
        status: "HUMAN_VALIDATED",
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );
  if (!updated) throw errors.notFound();
  await c.exerciseReviews.insertOne({
    _id: new ObjectId(),
    exerciseId: _id,
    reviewer: adminId,
    verdict: "HUMAN_VALIDATED",
    notes: "Contenu corrigé dans l'admin",
    createdAt: now,
  });
  await audit(adminId, "exercise.edit", "exercise", id);
  return updated;
}

/** Signalement par un enfant ou un parent : un exercice auto-validé repart en relecture humaine. */
export async function reportExercise(
  reporter: { type: "CHILD" | "PARENT"; id: string },
  id: string,
  input: ExerciseReportInput,
): Promise<void> {
  const c = collections();
  const _id = parseId(id);
  const exercise = await c.exercises.findOne({ _id }, { projection: { status: 1 } });
  if (!exercise) throw errors.notFound();
  const now = new Date();
  await c.exerciseReports.insertOne({
    _id: new ObjectId(),
    exerciseId: _id,
    reporterType: reporter.type,
    reporterId: reporter.id,
    reason: input.reason,
    comment: input.comment || null,
    resolvedAt: null,
    createdAt: now,
  });
  await c.exercises.updateOne(
    { _id },
    {
      $inc: { openReports: 1 },
      $set: { updatedAt: now, ...(exercise.status === "AUTO_VALIDATED" ? { status: "DRAFT" as const } : {}) },
    },
  );
}

export interface GenerationOutcome extends Omit<PipelineResult, "accepted"> {
  created: { id: string; status: ExerciseStatus; statement: string }[];
}

/** Génère des exercices pour une notion, les vérifie et les enregistre (statut AUTO_VALIDATED ou DRAFT). */
export async function generateForNotion(
  adminId: string | null,
  notionId: string,
  count: number,
): Promise<GenerationOutcome> {
  await ensureContentSynced();
  const ref = referentiel();
  const notion = ref.byId.get(notionId);
  if (!notion) throw errors.notFound();
  const c = collections();
  const existing = await c.exercises
    .find({ notionIds: notionId, status: { $ne: "REJECTED" } }, { projection: { statement: 1 } })
    .limit(30)
    .toArray();

  const llm = await getLlm();
  const result = await generateExercises(llm, {
    notion,
    ref,
    count,
    avoidStatements: existing.map((e) => e.statement),
  });

  const now = new Date();
  const created: GenerationOutcome["created"] = [];
  for (const a of result.accepted) {
    const hash = exerciseContentHash(a.content);
    if (await c.exercises.findOne({ contentHash: hash }, { projection: { _id: 1 } })) continue; // doublon exact
    const doc = newExerciseDoc(a.content, a.status, "AI", hash, { ...a.meta }, now);
    await c.exercises.insertOne(doc);
    if (a.meta.review) {
      await c.exerciseReviews.insertOne({
        _id: new ObjectId(),
        exerciseId: doc._id,
        reviewer: `ai:${a.meta.reviewModel}`,
        verdict: a.status,
        notes: a.meta.review.issues.join(" ; ") || null,
        createdAt: now,
      });
    }
    created.push({ id: doc._id.toHexString(), status: doc.status, statement: doc.statement });
  }
  await audit(adminId, "exercise.generate", "notion", notionId, {
    created: created.length,
    discarded: result.discarded.length,
  });
  return { created, discarded: result.discarded, generationFailed: result.generationFailed };
}

function newExerciseDoc(
  content: ExerciseContent,
  status: ExerciseStatus,
  source: ExerciseDoc["source"],
  contentHash: string,
  genMeta: Record<string, unknown> | null,
  now: Date,
): ExerciseDoc {
  return {
    _id: new ObjectId(),
    key: null,
    ...content,
    type: content.answer.type,
    status,
    source,
    contentHash,
    rating: initialRating(content.difficulty),
    stats: { served: 0, correct: 0 },
    openReports: 0,
    genMeta,
    createdAt: now,
    updatedAt: now,
  };
}

export interface BankStats {
  byStatus: Record<ExerciseStatus, number>;
  openReports: number;
  perNotion: Map<string, Partial<Record<ExerciseStatus, number>>>;
}

export async function bankStats(): Promise<BankStats> {
  await ensureContentSynced();
  const c = collections();
  const rows = await c.exercises
    .aggregate<{ _id: { notion: string; status: ExerciseStatus }; n: number }>([
      { $unwind: "$notionIds" },
      { $group: { _id: { notion: "$notionIds", status: "$status" }, n: { $sum: 1 } } },
    ])
    .toArray();
  const perNotion = new Map<string, Partial<Record<ExerciseStatus, number>>>();
  for (const r of rows) {
    const entry = perNotion.get(r._id.notion) ?? {};
    entry[r._id.status] = r.n;
    perNotion.set(r._id.notion, entry);
  }
  const byStatus = Object.fromEntries(EXERCISE_STATUSES.map((s) => [s, 0])) as Record<ExerciseStatus, number>;
  for (const r of await c.exercises
    .aggregate<{ _id: ExerciseStatus; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }])
    .toArray()) {
    byStatus[r._id] = r.n;
  }
  const openReports = await c.exerciseReports.countDocuments({ resolvedAt: null });
  return { byStatus, openReports, perNotion };
}
