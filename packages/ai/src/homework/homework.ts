import { SCHOOL_LEVELS, SUBJECTS } from "@devoirs/shared";
import { z } from "zod";
import type { LlmClient, LlmContent, LlmMessage } from "../llm";
import { MODELS } from "../models";
import { COACH_V1, buildCoachContext, type CoachContext } from "../prompts/coach.v1";
import { HOMEWORK_ANALYSIS_V1 } from "../prompts/homework-analysis.v1";
import { SAFETY_CLASSIFIER_V1 } from "../prompts/safety-classifier.v1";
import { detectDistressKeywords } from "./distress";
import { revealsNumericAnswer } from "./leak";

// ───────── Lecture de l'exercice

export const analysisSchema = z.object({
  readable: z.boolean(),
  unreadableReason: z.string().nullable(),
  outOfScope: z.enum(["none", "above_level", "below_level", "not_school"]),
  subject: z.enum(SUBJECTS).nullable(),
  level: z.enum(SCHOOL_LEVELS).nullable(),
  notionIds: z.array(z.string()),
  exerciseKind: z.string(),
  statement: z.string(),
  questions: z.array(
    z.object({
      index: z.number().int(),
      text: z.string(),
      answerKind: z.enum(["numeric", "short", "open", "writing"]),
      expectedAnswer: z.string().nullable(),
      solutionSteps: z.string(),
    }),
  ),
  containsPersonalInfo: z.boolean(),
});
export type HomeworkAnalysis = z.infer<typeof analysisSchema>;

export interface HomeworkImage {
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  base64: string;
}

/** Lit l'exercice depuis des photos et/ou un texte tapé. `catalogue` : « id : titre », une notion par ligne. */
export async function analyzeHomework(
  llm: LlmClient,
  input: { images: HomeworkImage[]; text: string | null; catalogue: string; knownNotionIds: Set<string> },
): Promise<HomeworkAnalysis | null> {
  const content: LlmContent[] = [
    ...input.images.map((img) => ({ type: "image" as const, mediaType: img.mediaType, base64: img.base64 })),
    {
      type: "text",
      text: input.text ? `Texte tapé par l'élève :\n${input.text}` : "Voici la photo de l'exercice.",
    },
  ];
  const res = await llm.structured({
    feature: "HOMEWORK_VISION",
    model: MODELS.strong,
    promptVersion: HOMEWORK_ANALYSIS_V1.version,
    system: HOMEWORK_ANALYSIS_V1.system(input.catalogue),
    messages: [{ role: "user", content }],
    schema: analysisSchema,
    effort: "medium",
  });
  if (!res.data) return null;
  // On ne garde que des notions qui existent vraiment dans le référentiel.
  return {
    ...res.data,
    notionIds: res.data.notionIds.filter((id) => input.knownNotionIds.has(id)).slice(0, 3),
  };
}

// ───────── Coach

export const coachReplySchema = z.object({
  reply: z.string(),
  intent: z.enum(["question", "hint", "feedback", "lesson", "recap", "redirect", "safety"]),
  hintLevel: z.number().int(),
  currentQuestion: z.number().int(),
  childAnswer: z.enum(["none", "correct", "partial", "incorrect"]),
  questionSolved: z.boolean(),
  allDone: z.boolean(),
  flags: z.object({
    distress: z.boolean(),
    personalInfo: z.boolean(),
    offTopic: z.boolean(),
    answerRequested: z.boolean(),
  }),
  recap: z.object({ learned: z.array(z.string()), notionsToWork: z.array(z.string()) }).nullable(),
});
export type CoachReply = z.infer<typeof coachReplySchema>;

export type CoachAction = "start" | "message" | "hint" | "stuck";

export interface CoachTurn {
  role: "child" | "coach";
  text: string;
  action?: CoachAction;
}

/** Ce que l'élève a fait, traduit en message pour le coach. */
function childTurnText(turn: CoachTurn): string {
  switch (turn.action) {
    case "start":
      return "[L'élève ouvre l'exercice et attend que tu commences.]";
    case "hint":
      return `[L'élève demande un indice.]${turn.text ? ` ${turn.text}` : ""}`;
    case "stuck":
      return "[L'élève appuie sur « Je n'y arrive vraiment pas ».]";
    default:
      return turn.text;
  }
}

export function buildCoachMessages(context: CoachContext, history: CoachTurn[]): LlmMessage[] {
  const messages: LlmMessage[] = [];
  const contextText = buildCoachContext(context);
  for (const [i, turn] of history.entries()) {
    const text = turn.role === "coach" ? turn.text : childTurnText(turn);
    const role = turn.role === "coach" ? "assistant" : "user";
    const content = i === 0 && role === "user" ? `${contextText}\n\n${text}` : text;
    const last = messages[messages.length - 1];
    // L'API attend une alternance : on regroupe deux messages consécutifs du même côté.
    if (last && last.role === role && typeof last.content === "string")
      last.content = `${last.content}\n\n${content}`;
    else messages.push({ role, content });
  }
  return messages;
}

export const SAFE_FALLBACK_HINT =
  "Je préfère te laisser trouver par toi-même, tu en es capable ! Reprends la dernière étape : qu'est-ce qu'on cherche exactement ?";

export interface CoachResult {
  reply: CoachReply;
  /** La réponse du modèle contenait la solution : elle a été remplacée. */
  leakBlocked: boolean;
}

/** Un tour du coach, avec le filet de sécurité anti-fuite de la réponse numérique. */
export async function coachTurn(
  llm: LlmClient,
  context: CoachContext,
  history: CoachTurn[],
): Promise<CoachResult | null> {
  const res = await llm.structured({
    feature: "HOMEWORK_COACH",
    model: MODELS.strong,
    promptVersion: COACH_V1.version,
    system: COACH_V1.system,
    messages: buildCoachMessages(context, history),
    schema: coachReplySchema,
    effort: "low",
    maxTokens: 8000,
  });
  if (!res.data) return null;
  const reply = res.data;
  const question = context.questions.find((q) => q.index === reply.currentQuestion);
  const lastChild = [...history].reverse().find((t) => t.role === "child")?.text ?? "";
  const leak =
    !reply.questionSolved &&
    question?.answerKind === "numeric" &&
    question.expectedAnswer !== null &&
    revealsNumericAnswer(reply.reply, question.expectedAnswer, lastChild);
  if (leak)
    return {
      reply: { ...reply, reply: SAFE_FALLBACK_HINT, intent: "hint", hintLevel: Math.max(1, reply.hintLevel) },
      leakBlocked: true,
    };
  return { reply, leakBlocked: false };
}

// ───────── Sécurité

export const safetySchema = z.object({
  distress: z.boolean(),
  category: z.enum(["harassment", "violence", "self_harm", "abuse", "sadness", "none"]),
  personalInfo: z.boolean(),
  inappropriate: z.boolean(),
  offTopic: z.boolean(),
});
export type SafetyClassification = z.infer<typeof safetySchema>;

/** Classe le message de l'élève (modèle rapide) + filet déterministe pour la détresse. */
export async function classifyMessage(llm: LlmClient, text: string): Promise<SafetyClassification> {
  const keyword = detectDistressKeywords(text);
  try {
    const res = await llm.structured({
      feature: "MODERATION",
      model: MODELS.fast,
      promptVersion: SAFETY_CLASSIFIER_V1.version,
      system: SAFETY_CLASSIFIER_V1.system,
      user: text,
      schema: safetySchema,
      effort: "low",
      maxTokens: 2000,
    });
    if (res.data) return { ...res.data, distress: res.data.distress || keyword };
  } catch {
    // Si le classifieur est indisponible, on garde le filet déterministe.
  }
  return {
    distress: keyword,
    category: keyword ? "sadness" : "none",
    personalInfo: false,
    inappropriate: false,
    offTopic: false,
  };
}
