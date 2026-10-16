import type { Db } from "mongodb";
import { getDb } from "./client";
import type {
  AiUsageLogDoc,
  AnswerAttemptDoc,
  DiagnosticSessionDoc,
  MasteryStateDoc,
  AuditLogDoc,
  ChildDoc,
  ChildSessionDoc,
  ConsentDoc,
  DeviceDoc,
  ExerciseDoc,
  ExerciseReportDoc,
  ExerciseReviewDoc,
  MetaDoc,
  NotionDoc,
} from "./types";

export const COLLECTIONS = {
  children: "children",
  consents: "consents",
  devices: "devices",
  childSessions: "childSessions",
  auditLogs: "auditLogs",
  notions: "notions",
  exercises: "exercises",
  exerciseReviews: "exerciseReviews",
  exerciseReports: "exerciseReports",
  aiUsage: "aiUsage",
  meta: "meta",
  masteryStates: "masteryStates",
  answerAttempts: "answerAttempts",
  diagnosticSessions: "diagnosticSessions",
} as const;

export function collections(db: Db = getDb()) {
  ensureIndexesOnce(db);
  return {
    children: db.collection<ChildDoc>(COLLECTIONS.children),
    consents: db.collection<ConsentDoc>(COLLECTIONS.consents),
    devices: db.collection<DeviceDoc>(COLLECTIONS.devices),
    childSessions: db.collection<ChildSessionDoc>(COLLECTIONS.childSessions),
    auditLogs: db.collection<AuditLogDoc>(COLLECTIONS.auditLogs),
    notions: db.collection<NotionDoc>(COLLECTIONS.notions),
    exercises: db.collection<ExerciseDoc>(COLLECTIONS.exercises),
    exerciseReviews: db.collection<ExerciseReviewDoc>(COLLECTIONS.exerciseReviews),
    exerciseReports: db.collection<ExerciseReportDoc>(COLLECTIONS.exerciseReports),
    aiUsage: db.collection<AiUsageLogDoc>(COLLECTIONS.aiUsage),
    meta: db.collection<MetaDoc>(COLLECTIONS.meta),
    masteryStates: db.collection<MasteryStateDoc>(COLLECTIONS.masteryStates),
    answerAttempts: db.collection<AnswerAttemptDoc>(COLLECTIONS.answerAttempts),
    diagnosticSessions: db.collection<DiagnosticSessionDoc>(COLLECTIONS.diagnosticSessions),
  };
}
export type Collections = ReturnType<typeof collections>;

/** Idempotent : à lancer à chaque déploiement (pnpm db:indexes). */
export async function ensureIndexes(db: Db = getDb()): Promise<void> {
  const c = collections(db);
  await Promise.all([
    c.children.createIndex({ parentId: 1, createdAt: 1 }),
    c.consents.createIndex({ userId: 1, type: 1, createdAt: -1 }),
    c.consents.createIndex({ childId: 1 }),
    c.devices.createIndex({ ownerId: 1 }),
    c.childSessions.createIndex({ tokenHash: 1 }, { unique: true }),
    c.childSessions.createIndex({ childId: 1 }),
    // MongoDB supprime lui-même les sessions expirées.
    c.childSessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    c.auditLogs.createIndex({ actorId: 1, createdAt: -1 }),
    c.notions.createIndex({ subject: 1, level: 1 }),
    c.exercises.createIndex({ status: 1, level: 1 }),
    c.exercises.createIndex({ notionIds: 1, status: 1 }),
    c.exercises.createIndex({ contentHash: 1 }),
    c.exercises.createIndex(
      { key: 1 },
      { unique: true, partialFilterExpression: { key: { $type: "string" } } },
    ),
    c.exercises.createIndex({ openReports: -1, updatedAt: -1 }),
    c.exerciseReviews.createIndex({ exerciseId: 1, createdAt: -1 }),
    c.exerciseReports.createIndex({ exerciseId: 1, resolvedAt: 1 }),
    c.aiUsage.createIndex({ createdAt: -1 }),
    c.aiUsage.createIndex({ feature: 1, createdAt: -1 }),
    c.masteryStates.createIndex({ childId: 1, notionId: 1 }, { unique: true }),
    c.masteryStates.createIndex({ childId: 1, nextReviewAt: 1 }),
    c.answerAttempts.createIndex({ childId: 1, notionId: 1, createdAt: -1 }),
    c.answerAttempts.createIndex({ childId: 1, exerciseId: 1 }),
    c.diagnosticSessions.createIndex({ childId: 1, subject: 1, startedAt: -1 }),
  ]);
}

const indexed = new WeakSet<Db>();

/**
 * Crée les index au premier accès à la base (une fois par instance serveur), sans bloquer les requêtes.
 * Évite d'avoir besoin de la base pendant le build Vercel.
 */
function ensureIndexesOnce(db: Db): void {
  if (indexed.has(db)) return;
  indexed.add(db);
  ensureIndexes(db).catch((err: unknown) => {
    indexed.delete(db);
    console.error("[db] création des index échouée", err instanceof Error ? err.message : err);
  });
}
