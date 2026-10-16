import { referentiel } from "@devoirs/content";
import { collections, type DiagnosticSessionDoc, type ExerciseDoc } from "@devoirs/db";
import {
  DEFAULT_MAX_ITEMS,
  correct,
  initialQueue,
  nextNotion,
  outcomeFromScore,
  recordResult,
  summarize,
  toPublicExercise,
  type DiagnosticContext,
  type DiagnosticState,
} from "@devoirs/pedagogy";
import {
  SERVABLE_STATUSES,
  type ChildPublic,
  type DiagnosticAnswerInput,
  type DiagnosticFeedback,
  type DiagnosticOverviewItem,
  type DiagnosticStep,
  type DiagnosticSummary,
  type ExerciseType,
  type Subject,
} from "@devoirs/shared";
import { ObjectId, type Filter } from "mongodb";
import { HttpError, errors } from "../http";
import { ensureContentSynced } from "./content-sync";
import { applyAttempt, inferPrerequisites } from "./mastery";

/** Types corrigés entièrement par le code (pas besoin de l'IA pendant le diagnostic). */
const DIAGNOSTIC_TYPES: ExerciseType[] = [
  "MCQ",
  "NUMERIC",
  "FILL_BLANKS",
  "MATCHING",
  "ORDERING",
  "TRUE_FALSE",
];
/** Un diagnostic vise des exercices plutôt accessibles (un peu sous la difficulté moyenne). */
const TARGET_RATING = -100;

const usableFilter = (subject?: Subject): Filter<ExerciseDoc> => ({
  status: { $in: [...SERVABLE_STATUSES] },
  type: { $in: DIAGNOSTIC_TYPES },
  "answer.requireJustification": { $ne: true },
  ...(subject ? { "notionIds.0": { $regex: `^${subjectPrefix(subject)}\\.` } } : {}),
});

function subjectPrefix(subject: Subject): string {
  return {
    MATHS: "ma",
    FRANCAIS: "fr",
    ANGLAIS: "an",
    HIST_GEO_EMC: "hg",
    SVT: "svt",
    PHYSIQUE_CHIMIE: "pc",
  }[subject];
}

/** Notions (de la matière) pour lesquelles au moins un exercice est utilisable. */
async function testableNotions(subject: Subject): Promise<Set<string>> {
  const ids = await collections().exercises.distinct("notionIds.0", usableFilter(subject));
  return new Set(ids.filter((x): x is string => typeof x === "string"));
}

async function context(subject: Subject): Promise<DiagnosticContext> {
  return { byId: referentiel().byId, testable: await testableNotions(subject) };
}

async function pickExercise(notionId: string, exclude: string[]): Promise<ExerciseDoc | null> {
  const candidates = await collections()
    .exercises.find({
      ...usableFilter(),
      "notionIds.0": notionId,
      _id: { $nin: exclude.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) },
    })
    .limit(50)
    .toArray();
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => Math.abs(a.rating - TARGET_RATING) - Math.abs(b.rating - TARGET_RATING));
  // Un peu de variété entre les enfants : tirage parmi les 3 plus proches de la cible.
  return candidates[Math.floor(Math.random() * Math.min(3, candidates.length))] ?? null;
}

const toState = (s: DiagnosticSessionDoc): DiagnosticState => ({
  queue: s.queue,
  results: s.results.map(({ notionId, outcome, score }) => ({ notionId, outcome, score })),
  maxItems: s.maxItems,
});

function buildSummary(state: DiagnosticState, ctx: DiagnosticContext): DiagnosticSummary {
  const { mastered, toWork } = summarize(state, ctx);
  const named = (id: string) => ({ id, title: ctx.byId.get(id)?.title ?? id });
  return { mastered: mastered.map(named), toWork: toWork.map(named) };
}

/** Choisit et enregistre l'exercice suivant ; termine le diagnostic s'il n'y en a plus. */
async function advance(session: DiagnosticSessionDoc, ctx: DiagnosticContext): Promise<DiagnosticSessionDoc> {
  const c = collections();
  let state = toState(session);
  for (;;) {
    const notionId = nextNotion(state, ctx);
    if (!notionId) {
      const now = new Date();
      const done = {
        ...session,
        queue: state.queue,
        status: "COMPLETED" as const,
        current: null,
        completedAt: now,
        updatedAt: now,
      };
      await c.diagnosticSessions.replaceOne({ _id: session._id }, done);
      return done;
    }
    const exercise = await pickExercise(notionId, session.shownExerciseIds);
    if (!exercise) {
      // Plus d'exercice disponible pour cette notion : on la retire et on passe à la suivante.
      ctx.testable.delete(notionId);
      state = { ...state, queue: state.queue.filter((id) => id !== notionId) };
      continue;
    }
    const now = new Date();
    const next: DiagnosticSessionDoc = {
      ...session,
      queue: state.queue,
      current: { exerciseId: exercise._id.toHexString(), notionId, servedAt: now },
      shownExerciseIds: [...session.shownExerciseIds, exercise._id.toHexString()],
      updatedAt: now,
    };
    await c.diagnosticSessions.replaceOne({ _id: session._id }, next);
    return next;
  }
}

async function stepFrom(
  session: DiagnosticSessionDoc,
  ctx: DiagnosticContext,
  feedback: DiagnosticFeedback | null,
): Promise<DiagnosticStep> {
  const progress = { asked: session.results.length, max: session.maxItems };
  if (session.status === "COMPLETED" || !session.current) {
    return {
      sessionId: session._id.toHexString(),
      subject: session.subject,
      feedback,
      exercise: null,
      progress,
      summary: buildSummary(toState(session), ctx),
    };
  }
  const ex = await collections().exercises.findOne({ _id: new ObjectId(session.current.exerciseId) });
  if (!ex) throw errors.notFound();
  return {
    sessionId: session._id.toHexString(),
    subject: session.subject,
    feedback,
    exercise: toPublicExercise(
      { id: ex._id.toHexString(), statement: ex.statement, answer: ex.answer },
      `${session._id.toHexString()}:${ex._id.toHexString()}`,
    ),
    progress,
    summary: null,
  };
}

/** Démarre le diagnostic d'une matière, ou reprend celui en cours (il peut se faire en plusieurs fois). */
export async function startOrResume(child: ChildPublic, subject: Subject): Promise<DiagnosticStep> {
  await ensureContentSynced();
  const c = collections();
  const ctx = await context(subject);
  const existing = await c.diagnosticSessions.findOne({ childId: child.id, subject, status: "IN_PROGRESS" });
  if (existing) {
    const session = existing.current ? existing : await advance(existing, ctx);
    return stepFrom(session, ctx, null);
  }
  const queue = initialQueue(referentiel().notions, subject, child.level, ctx.testable);
  if (queue.length === 0) throw new HttpError(409, "DIAGNOSTIC_UNAVAILABLE", "diagnostic.unavailableMessage");
  const now = new Date();
  const session: DiagnosticSessionDoc = {
    _id: new ObjectId(),
    childId: child.id,
    subject,
    status: "IN_PROGRESS",
    queue,
    results: [],
    maxItems: DEFAULT_MAX_ITEMS,
    current: null,
    shownExerciseIds: [],
    startedAt: now,
    updatedAt: now,
    completedAt: null,
  };
  await c.diagnosticSessions.insertOne(session);
  return stepFrom(await advance(session, ctx), ctx, null);
}

const FEEDBACK: Record<"pass" | "partial" | "fail" | "skip", DiagnosticFeedback> = {
  pass: { kind: "good", messageKey: "diagnostic.feedback.good" },
  partial: { kind: "partial", messageKey: "diagnostic.feedback.partial" },
  fail: { kind: "notYet", messageKey: "diagnostic.feedback.notYet" },
  skip: { kind: "skipped", messageKey: "diagnostic.feedback.skipped" },
};

/** Corrige la réponse, met à jour la maîtrise et renvoie l'exercice suivant (ou le bilan). */
export async function answer(
  child: ChildPublic,
  sessionId: string,
  input: DiagnosticAnswerInput,
): Promise<DiagnosticStep> {
  if (!ObjectId.isValid(sessionId)) throw errors.notFound();
  const c = collections();
  const session = await c.diagnosticSessions.findOne({ _id: new ObjectId(sessionId), childId: child.id });
  if (!session) throw errors.notFound();
  if (session.status !== "IN_PROGRESS" || session.current?.exerciseId !== input.exerciseId) {
    throw new HttpError(409, "NOT_CURRENT_EXERCISE", "errors.generic");
  }
  const exercise = await c.exercises.findOne({ _id: new ObjectId(input.exerciseId) });
  if (!exercise) throw errors.notFound();
  const ctx = await context(session.subject);

  const skipped = "skipped" in input;
  let score = 0;
  let outcomeLabel = "skipped";
  if (!skipped) {
    const result = correct(exercise.answer, input.response);
    // Saisie illisible ou mauvaise unité : l'élève corrige, ça ne compte pas.
    if (result.outcome === "invalid") {
      return stepFrom(session, ctx, { kind: "retry", messageKey: `exercise.feedback.${result.feedback}` });
    }
    score = result.score;
    outcomeLabel = result.outcome;
  }

  const notionId = session.current.notionId;
  await c.answerAttempts.insertOne({
    _id: new ObjectId(),
    childId: child.id,
    exerciseId: exercise._id,
    notionId,
    context: "diagnostic",
    contextId: sessionId,
    response: skipped ? null : input.response,
    skipped,
    outcome: outcomeLabel,
    score,
    hintsUsed: 0,
    durationMs: input.durationMs ?? null,
    createdAt: new Date(),
  });
  await applyAttempt({
    childId: child.id,
    notionId,
    exerciseId: exercise._id,
    exerciseRating: exercise.rating,
    score,
    context: "diagnostic",
  });

  const outcome = skipped ? "skip" : outcomeFromScore(score);
  if (outcome === "pass") await inferPrerequisites(child.id, ctx.byId.get(notionId)?.prerequisites ?? []);

  const state = recordResult(toState(session), { notionId, outcome, score }, ctx);
  const updated: DiagnosticSessionDoc = {
    ...session,
    queue: state.queue,
    results: [...session.results, { notionId, outcome, score, exerciseId: input.exerciseId }],
    current: null,
  };
  const next = await advance(updated, ctx);
  const fb = FEEDBACK[outcome === "fail" && score > 0 ? "partial" : outcome];
  return stepFrom(next, ctx, fb);
}

/** Où en est l'enfant dans le diagnostic de chacune de ses matières. */
export async function overview(child: ChildPublic): Promise<DiagnosticOverviewItem[]> {
  await ensureContentSynced();
  const c = collections();
  const items: DiagnosticOverviewItem[] = [];
  for (const subject of child.settings.subjects) {
    const latest = await c.diagnosticSessions.findOne(
      { childId: child.id, subject },
      { sort: { startedAt: -1 } },
    );
    if (!latest) {
      const ctx = await context(subject);
      const available = initialQueue(referentiel().notions, subject, child.level, ctx.testable).length > 0;
      items.push({
        subject,
        status: available ? "NOT_STARTED" : "UNAVAILABLE",
        sessionId: null,
        progress: null,
        summary: null,
      });
      continue;
    }
    const progress = { asked: latest.results.length, max: latest.maxItems };
    const summary =
      latest.status === "COMPLETED" ? buildSummary(toState(latest), await context(subject)) : null;
    items.push({ subject, status: latest.status, sessionId: latest._id.toHexString(), progress, summary });
  }
  return items;
}
