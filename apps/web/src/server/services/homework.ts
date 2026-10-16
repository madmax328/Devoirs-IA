import {
  analyzeHomework,
  classifyMessage,
  coachTurn,
  maskPersonalInfo,
  HOMEWORK_ANALYSIS_V1,
  type CoachContext,
  type CoachTurn,
  type LlmClient,
} from "@devoirs/ai";
import { referentiel } from "@devoirs/content";
import {
  collections,
  type HomeworkAnalysisData,
  type HomeworkHelpDoc,
  type HomeworkMessageDoc,
} from "@devoirs/db";
import type {
  ChildPublic,
  CreateHomeworkInput,
  HomeworkListItem,
  HomeworkMessageInput,
  HomeworkMessageView,
  HomeworkView,
} from "@devoirs/shared";
import { translate, DEFAULT_LOCALE } from "@devoirs/shared/i18n";
import { createHash } from "node:crypto";
import { Binary, ObjectId } from "mongodb";
import { decrypt, encrypt } from "../crypto";
import { HttpError, errors } from "../http";
import { getLlm } from "./ai";
import { consume, LIMITS } from "./limits";
import { applyAttempt } from "./mastery";
import { notifyParentOfDifficultMoment, recordSafetyEvent } from "./safety";

const t = (k: Parameters<typeof translate>[1]) => translate(DEFAULT_LOCALE, k);
export const PHOTO_RETENTION_DAYS = () => Number(process.env.PHOTO_RETENTION_DAYS) || 30;

/** Le coach indisponible (clé absente, budget du jour atteint) : message adapté à un enfant. */
async function childLlm(): Promise<LlmClient> {
  try {
    return await getLlm();
  } catch (e) {
    if (e instanceof HttpError) throw new HttpError(503, "COACH_UNAVAILABLE", "homework.coachUnavailable");
    throw e;
  }
}

let catalogueCache: string | null = null;
const catalogue = () =>
  (catalogueCache ??= referentiel()
    .notions.map((n) => `${n.id} : ${n.title}`)
    .join("\n"));

function parseId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw errors.notFound();
  return new ObjectId(id);
}

async function ownedHomework(child: ChildPublic, id: string): Promise<HomeworkHelpDoc> {
  const doc = await collections().homeworkHelps.findOne({ _id: parseId(id), childId: child.id });
  if (!doc) throw errors.notFound();
  return doc;
}

// ───────── Vues (rien de confidentiel ne sort d'ici)

function notionTitles(ids: string[]) {
  const ref = referentiel();
  return ids.filter((id) => ref.byId.has(id)).map((id) => ({ id, title: ref.byId.get(id)!.title }));
}

function messageView(m: HomeworkMessageDoc): HomeworkMessageView {
  return {
    id: m._id.toHexString(),
    role: m.role,
    action: m.action,
    text: m.text,
    hintLevel: m.hintLevel,
    safety: m.safety,
    createdAt: m.createdAt.toISOString(),
  };
}

async function view(doc: HomeworkHelpDoc): Promise<HomeworkView> {
  const messages = await collections()
    .homeworkMessages.find({ homeworkId: doc._id })
    .sort({ createdAt: 1, _id: 1 })
    .toArray();
  const a = doc.analysis;
  return {
    id: doc._id.toHexString(),
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    photoCount: doc.photoIds.length,
    analysis: a && {
      subject: a.subject,
      level: a.level,
      exerciseKind: a.exerciseKind,
      statement: a.statement,
      notions: notionTitles(a.notionIds),
      questionCount: a.questions.length,
      unreadableReason: a.unreadableReason,
      outOfScope: a.outOfScope,
    },
    // Les messages « start » (techniques) ne sont pas affichés.
    messages: messages.filter((m) => !(m.role === "child" && m.action === "start")).map(messageView),
    recap: doc.recap && { learned: doc.recap.learned, notionsToWork: notionTitles(doc.recap.notionsToWork) },
    hintsUsed: doc.hintsUsed,
  };
}

// ───────── Création et lecture de l'exercice

function statusFromAnalysis(a: HomeworkAnalysisData): HomeworkHelpDoc["status"] {
  if (!a.readable) return "UNREADABLE";
  if (a.outOfScope === "not_school") return "OUT_OF_SCOPE";
  return "TO_CONFIRM";
}

async function analyze(
  llm: LlmClient,
  inputHash: string,
  images: CreateHomeworkInput["photos"],
  text: string | null,
): Promise<HomeworkAnalysisData> {
  const c = collections();
  const cached = await c.analysisCache.findOne({
    _id: inputHash,
    promptVersion: HOMEWORK_ANALYSIS_V1.version,
  });
  if (cached) return cached.analysis;
  const analysis = await analyzeHomework(llm, {
    images,
    text,
    catalogue: catalogue(),
    knownNotionIds: new Set(referentiel().byId.keys()),
  });
  if (!analysis) throw new HttpError(502, "ANALYSIS_FAILED", "homework.analysisFailed");
  // Par précaution, l'énoncé transcrit passe aussi par le masquage.
  const safe: HomeworkAnalysisData = { ...analysis, statement: maskPersonalInfo(analysis.statement).text };
  await c.analysisCache.updateOne(
    { _id: inputHash },
    { $set: { analysis: safe, promptVersion: HOMEWORK_ANALYSIS_V1.version, createdAt: new Date() } },
    { upsert: true },
  );
  return safe;
}

export async function createHomework(
  child: ChildPublic,
  parentId: string,
  input: CreateHomeworkInput,
): Promise<HomeworkView> {
  const llm = await childLlm();
  await consume(child.id, "homework", LIMITS.homeworkPerDay());
  const c = collections();
  const text = input.text ? maskPersonalInfo(input.text).text : null;
  const inputHash = createHash("sha256")
    .update(JSON.stringify([input.photos.map((p) => p.base64), text]))
    .digest("hex");

  const _id = new ObjectId();
  const now = new Date();
  const purgeAt = new Date(now.getTime() + PHOTO_RETENTION_DAYS() * 86_400_000);
  const photoIds: ObjectId[] = [];
  for (const p of input.photos) {
    const raw = Buffer.from(p.base64, "base64");
    const enc = encrypt(raw);
    const photoId = new ObjectId();
    await c.homeworkPhotos.insertOne({
      _id: photoId,
      homeworkId: _id,
      childId: child.id,
      mediaType: p.mediaType,
      iv: new Binary(enc.iv),
      tag: new Binary(enc.tag),
      data: new Binary(enc.data),
      size: raw.length,
      purgeAt,
      createdAt: now,
    });
    photoIds.push(photoId);
  }

  const analysis = await analyze(llm, inputHash, input.photos, text);
  const doc: HomeworkHelpDoc = {
    _id,
    childId: child.id,
    parentId,
    status: statusFromAnalysis(analysis),
    inputHash,
    typedText: text,
    photoIds,
    analysis,
    hintsUsed: 0,
    stuckCount: 0,
    solvedQuestions: [],
    recap: null,
    messageCount: 0,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
  await c.homeworkHelps.insertOne(doc);
  if (analysis.containsPersonalInfo) await recordSafetyEvent(child.id, parentId, "PERSONAL_INFO");
  return view(doc);
}

// ───────── Coaching

function coachContext(a: HomeworkAnalysisData): CoachContext {
  return {
    subjectLabel: a.subject ? t(`subjects.${a.subject}`) : "inconnue",
    levelLabel: a.level ? t(`levels.${a.level}`) : "collège",
    exerciseKind: a.exerciseKind,
    statement: a.statement,
    questions: a.questions,
    notions: notionTitles(a.notionIds),
  };
}

async function history(homeworkId: ObjectId): Promise<CoachTurn[]> {
  const msgs = await collections()
    .homeworkMessages.find({ homeworkId, safety: null })
    .sort({ createdAt: 1, _id: 1 })
    .toArray();
  return msgs.map((m) => ({ role: m.role, text: m.text, ...(m.action ? { action: m.action } : {}) }));
}

async function insertMessage(
  doc: HomeworkHelpDoc,
  m: Omit<HomeworkMessageDoc, "_id" | "homeworkId" | "childId" | "createdAt">,
): Promise<void> {
  await collections().homeworkMessages.insertOne({
    _id: new ObjectId(),
    homeworkId: doc._id,
    childId: doc.childId,
    createdAt: new Date(),
    ...m,
  });
}

/** Un tour de coach : appelle l'IA, applique les filets de sécurité, enregistre et met à jour l'état. */
async function runCoach(llm: LlmClient, doc: HomeworkHelpDoc, turns: CoachTurn[]): Promise<void> {
  const result = await coachTurn(llm, coachContext(doc.analysis!), turns);
  if (!result) throw new HttpError(502, "COACH_FAILED", "homework.coachUnavailable");
  const r = result.reply;
  const c = collections();
  if (result.leakBlocked) await recordSafetyEvent(doc.childId, doc.parentId, "ANSWER_LEAK_BLOCKED");
  if (r.flags.distress) {
    await stopForDistress(doc);
    return;
  }
  await insertMessage(doc, {
    role: "coach",
    action: null,
    text: r.reply,
    intent: r.intent,
    hintLevel: r.hintLevel || null,
    safety: null,
  });

  const solved = r.questionSolved
    ? [...new Set([...doc.solvedQuestions, r.currentQuestion])]
    : doc.solvedQuestions;
  const set: Partial<HomeworkHelpDoc> = { solvedQuestions: solved, updatedAt: new Date() };
  if (r.allDone) {
    set.status = "COMPLETED";
    set.completedAt = new Date();
    set.recap = {
      learned: r.recap?.learned ?? [],
      notionsToWork: (r.recap?.notionsToWork ?? []).filter((id) => referentiel().byId.has(id)),
    };
  }
  await c.homeworkHelps.updateOne({ _id: doc._id }, { $set: set });
  if (r.allDone) await updateMasteryAfterHomework({ ...doc, ...set } as HomeworkHelpDoc);
}

/** Détresse : on arrête l'exercice, message bienveillant + numéros d'aide, parent prévenu sans le contenu. */
async function stopForDistress(doc: HomeworkHelpDoc): Promise<void> {
  await insertMessage(doc, {
    role: "coach",
    action: null,
    text: t("safety.distressMessage"),
    intent: "safety",
    hintLevel: null,
    safety: "distress",
  });
  await collections().homeworkHelps.updateOne(
    { _id: doc._id },
    { $set: { status: "SAFETY_STOP", updatedAt: new Date() } },
  );
  await recordSafetyEvent(doc.childId, doc.parentId, "DISTRESS");
  await notifyParentOfDifficultMoment(doc.parentId, doc.childId);
}

/** Fin d'un devoir : la maîtrise des notions est mise à jour (poids réduit, encore moins avec beaucoup d'indices). */
async function updateMasteryAfterHomework(doc: HomeworkHelpDoc): Promise<void> {
  const a = doc.analysis;
  if (!a || a.notionIds.length === 0) return;
  const total = Math.max(1, a.questions.length);
  const score = Math.min(1, doc.solvedQuestions.length / total);
  const hints = doc.hintsUsed + 2 * doc.stuckCount;
  for (const notionId of a.notionIds) {
    await applyAttempt({
      childId: doc.childId,
      notionId,
      exerciseId: doc._id,
      exerciseRating: 0,
      score,
      context: "homework",
      hintsUsed: hints,
    });
  }
  // Notions à retravailler : programmées pour une révision prochaine (sessions du jour, jalon 5).
  const toWork = new Set([...(doc.recap?.notionsToWork ?? []), ...(score < 1 ? a.notionIds : [])]);
  if (toWork.size > 0) {
    await collections().masteryStates.updateMany(
      { childId: doc.childId, notionId: { $in: [...toWork] } },
      { $set: { nextReviewAt: new Date() } },
    );
  }
}

export async function confirmHomework(
  child: ChildPublic,
  id: string,
  correctedStatement: string | null,
): Promise<HomeworkView> {
  let doc = await ownedHomework(child, id);
  if (doc.status !== "TO_CONFIRM" || !doc.analysis) throw new HttpError(409, "BAD_STATE", "errors.generic");
  const llm = await childLlm();
  const c = collections();
  if (correctedStatement) {
    // L'enfant a corrigé l'énoncé : on relit à partir de son texte.
    const text = maskPersonalInfo(correctedStatement).text;
    const inputHash = createHash("sha256")
      .update(JSON.stringify([[], text]))
      .digest("hex");
    const analysis = await analyze(llm, inputHash, [], text);
    await c.homeworkHelps.updateOne(
      { _id: doc._id },
      { $set: { analysis: { ...analysis, readable: true }, typedText: text, updatedAt: new Date() } },
    );
    doc = (await c.homeworkHelps.findOne({ _id: doc._id }))!;
  }
  await c.homeworkHelps.updateOne(
    { _id: doc._id },
    { $set: { status: "IN_PROGRESS", updatedAt: new Date() } },
  );
  doc = { ...doc, status: "IN_PROGRESS" };
  await insertMessage(doc, {
    role: "child",
    action: "start",
    text: "",
    intent: null,
    hintLevel: null,
    safety: null,
  });
  await runCoach(llm, doc, await history(doc._id));
  return view((await c.homeworkHelps.findOne({ _id: doc._id }))!);
}

export async function sendMessage(
  child: ChildPublic,
  id: string,
  input: HomeworkMessageInput,
): Promise<HomeworkView> {
  const doc = await ownedHomework(child, id);
  if (doc.status !== "IN_PROGRESS") throw new HttpError(409, "BAD_STATE", "errors.generic");
  if (input.action === "message" && !input.text) throw errors.badRequest();
  if (doc.messageCount >= LIMITS.messagesPerHomework())
    throw new HttpError(429, "MESSAGE_LIMIT", "homework.messageLimit");
  const llm = await childLlm();
  const c = collections();

  const masked = maskPersonalInfo(input.text);
  // Classification de sécurité du message de l'enfant (en parallèle de rien : on en a besoin avant le coach).
  const safety = masked.text ? await classifyMessage(llm, input.text) : null;
  await insertMessage(doc, {
    role: "child",
    action: input.action,
    text: masked.text,
    intent: null,
    hintLevel: null,
    safety: null,
  });
  await c.homeworkHelps.updateOne(
    { _id: doc._id },
    {
      $inc: {
        messageCount: 1,
        hintsUsed: input.action === "hint" ? 1 : 0,
        stuckCount: input.action === "stuck" ? 1 : 0,
      },
      $set: { updatedAt: new Date() },
    },
  );
  if (masked.found.length > 0 || safety?.personalInfo)
    await recordSafetyEvent(child.id, doc.parentId, "PERSONAL_INFO");

  if (safety?.distress) {
    await stopForDistress(doc);
  } else if (safety?.inappropriate) {
    await insertMessage(doc, {
      role: "coach",
      action: null,
      text: t("safety.inappropriateMessage"),
      intent: "redirect",
      hintLevel: null,
      safety: "inappropriate",
    });
    await recordSafetyEvent(child.id, doc.parentId, "INAPPROPRIATE");
  } else {
    const fresh = (await c.homeworkHelps.findOne({ _id: doc._id }))!;
    await runCoach(llm, fresh, await history(doc._id));
  }
  return view((await c.homeworkHelps.findOne({ _id: doc._id }))!);
}

export async function abandonHomework(child: ChildPublic, id: string): Promise<void> {
  const doc = await ownedHomework(child, id);
  if (doc.status === "COMPLETED" || doc.status === "SAFETY_STOP") return;
  await collections().homeworkHelps.updateOne(
    { _id: doc._id },
    { $set: { status: "ABANDONED", updatedAt: new Date() } },
  );
}

export async function getHomework(child: ChildPublic, id: string): Promise<HomeworkView> {
  return view(await ownedHomework(child, id));
}

export async function listHomework(child: ChildPublic): Promise<HomeworkListItem[]> {
  const docs = await collections()
    .homeworkHelps.find({ childId: child.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  return docs.map((d) => ({
    id: d._id.toHexString(),
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    subject: d.analysis?.subject ?? null,
    exerciseKind: d.analysis?.exerciseKind ?? null,
  }));
}

/** Photo déchiffrée (pour l'historique de l'enfant). */
export async function getPhoto(
  child: ChildPublic,
  id: string,
  index: number,
): Promise<{ mediaType: string; data: Buffer }> {
  const doc = await ownedHomework(child, id);
  const photoId = doc.photoIds[index];
  if (!photoId) throw errors.notFound();
  const photo = await collections().homeworkPhotos.findOne({ _id: photoId, childId: child.id });
  if (!photo) throw errors.notFound(); // déjà supprimée (plus de 30 jours)
  const data = decrypt({
    iv: Buffer.from(photo.iv.buffer),
    tag: Buffer.from(photo.tag.buffer),
    data: Buffer.from(photo.data.buffer),
  });
  return { mediaType: photo.mediaType, data };
}
