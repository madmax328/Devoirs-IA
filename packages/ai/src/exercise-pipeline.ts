import { checkExercise, type Referentiel } from "@devoirs/content";
import {
  NUMERIC_FORMATS,
  exerciseContentSchema,
  type ExerciseContent,
  type ExerciseStatus,
  type ExerciseType,
  type Notion,
} from "@devoirs/shared";
import { translate, DEFAULT_LOCALE } from "@devoirs/shared/i18n";
import { z } from "zod";
import type { LlmClient } from "./llm";
import { checkNumericAnswer, type MathCheck } from "./math-check";
import { MODELS } from "./models";
import { EXERCISE_GENERATION_V1, buildGenerationRequest } from "./prompts/exercise-generation.v1";
import { EXERCISE_REVIEW_V1, buildReviewRequest } from "./prompts/exercise-review.v1";

// ───────── Format demandé à l'IA (simple, compatible avec les sorties structurées)

const aiAnswerSchema = z.union([
  z.object({
    type: z.literal("MCQ"),
    choices: z.array(z.string()),
    correct: z.array(z.number().int()),
    multiple: z.boolean(),
  }),
  z.object({
    type: z.literal("NUMERIC"),
    value: z.string(),
    tolerance: z.number(),
    unit: z.string().nullable(),
    format: z.enum(NUMERIC_FORMATS),
  }),
  z.object({
    type: z.literal("FILL_BLANKS"),
    text: z.string(),
    blanks: z.array(
      z.object({ id: z.string(), accepted: z.array(z.string()), accentSensitive: z.boolean() }),
    ),
  }),
  z.object({
    type: z.literal("MATCHING"),
    left: z.array(z.string()),
    right: z.array(z.string()),
    pairs: z.array(z.object({ left: z.number().int(), right: z.number().int() })),
  }),
  z.object({ type: z.literal("ORDERING"), items: z.array(z.string()) }),
  z.object({
    type: z.literal("TRUE_FALSE"),
    correct: z.boolean(),
    requireJustification: z.boolean(),
    expectedJustification: z.string().nullable(),
  }),
  z.object({ type: z.literal("SHORT_TEXT"), modelAnswer: z.string(), criteria: z.array(z.string()) }),
]);

export const aiGenerationSchema = z.object({
  exercises: z.array(
    z.object({
      statement: z.string(),
      difficulty: z.number().int(),
      answer: aiAnswerSchema,
      explanation: z.string(),
      hints: z.array(z.string()),
      verificationExpression: z.string().nullable(),
    }),
  ),
});
export type AiGeneratedExercise = z.infer<typeof aiGenerationSchema>["exercises"][number];

export const aiReviewSchema = z.object({
  verdict: z.enum(["approve", "revise", "reject"]),
  answerCorrect: z.boolean(),
  unambiguous: z.boolean(),
  levelAppropriate: z.boolean(),
  hintsOk: z.boolean(),
  issues: z.array(z.string()),
});
export type AiReview = z.infer<typeof aiReviewSchema>;

// ───────── Pipeline

export interface GenerationMeta {
  model: string;
  promptVersion: string;
  reviewModel: string;
  reviewPromptVersion: string;
  mathCheck: MathCheck["status"] | "not_applicable";
  review: AiReview | null;
}

export interface AcceptedExercise {
  content: ExerciseContent;
  status: Extract<ExerciseStatus, "AUTO_VALIDATED" | "DRAFT">;
  meta: GenerationMeta;
}

export interface DiscardedExercise {
  statement: string;
  reasons: string[];
}

export interface PipelineResult {
  accepted: AcceptedExercise[];
  discarded: DiscardedExercise[];
  /** La génération elle-même a échoué (refus, sortie invalide). */
  generationFailed: boolean;
}

const DEFAULT_TYPES: Record<string, ExerciseType[]> = {
  MATHS: ["NUMERIC", "MCQ", "NUMERIC", "TRUE_FALSE", "ORDERING"],
  FRANCAIS: ["FILL_BLANKS", "MCQ", "MATCHING", "FILL_BLANKS", "SHORT_TEXT"],
};
const OTHER_TYPES: ExerciseType[] = ["MCQ", "TRUE_FALSE", "MATCHING", "FILL_BLANKS"];

export function planTypes(subject: string, count: number): ExerciseType[] {
  const cycle = DEFAULT_TYPES[subject] ?? OTHER_TYPES;
  return Array.from({ length: count }, (_, i) => cycle[i % cycle.length]!);
}

export function planDifficulties(count: number): number[] {
  const cycle = [2, 3, 4, 1, 5];
  return Array.from({ length: count }, (_, i) => cycle[i % cycle.length]!);
}

/** Convertit la sortie de l'IA vers le modèle d'exercice de l'application. */
export function toExerciseContent(ai: AiGeneratedExercise, notion: Notion): unknown {
  const answer =
    ai.answer.type === "MATCHING"
      ? { ...ai.answer, pairs: ai.answer.pairs.map((p) => [p.left, p.right]) }
      : ai.answer;
  return {
    notionIds: [notion.id],
    level: notion.level,
    difficulty: Math.min(5, Math.max(1, Math.round(ai.difficulty))),
    statement: ai.statement.trim(),
    answer,
    explanation: ai.explanation.trim(),
    hints: ai.hints.map((h) => h.trim()),
  };
}

export interface GenerateOptions {
  notion: Notion;
  ref: Referentiel;
  count: number;
  types?: ExerciseType[];
  avoidStatements?: string[];
  generationModel?: string;
  reviewModel?: string;
}

export async function generateExercises(llm: LlmClient, opts: GenerateOptions): Promise<PipelineResult> {
  const { notion, ref } = opts;
  const count = Math.min(Math.max(opts.count, 1), 5);
  const generationModel = opts.generationModel ?? MODELS.strong;
  const reviewModel = opts.reviewModel ?? MODELS.strong;
  const t = (k: Parameters<typeof translate>[1]) => translate(DEFAULT_LOCALE, k);

  const prerequisites = notion.prerequisites
    .map((id) => ref.byId.get(id)?.title)
    .filter((x): x is string => Boolean(x));

  const generation = await llm.structured({
    feature: "EXERCISE_GEN",
    model: generationModel,
    promptVersion: EXERCISE_GENERATION_V1.version,
    system: EXERCISE_GENERATION_V1.system,
    user: buildGenerationRequest({
      notion: {
        id: notion.id,
        title: notion.title,
        description: notion.description,
        levelLabel: t(`levels.${notion.level}`),
        subjectLabel: t(`subjects.${notion.subject}`),
        commonMistakes: notion.commonMistakes,
        examples: notion.examples,
      },
      prerequisites,
      count,
      types: opts.types ?? planTypes(notion.subject, count),
      difficulties: planDifficulties(count),
      avoidStatements: (opts.avoidStatements ?? []).slice(0, 30),
    }),
    schema: aiGenerationSchema,
    effort: "high",
  });

  if (!generation.data) return { accepted: [], discarded: [], generationFailed: true };

  const discarded: DiscardedExercise[] = [];
  const candidates: { content: ExerciseContent; mathCheck: GenerationMeta["mathCheck"] }[] = [];

  for (const ai of generation.data.exercises.slice(0, count)) {
    // 1. Validation stricte du format.
    const parsed = exerciseContentSchema.safeParse(toExerciseContent(ai, notion));
    if (!parsed.success) {
      discarded.push({
        statement: ai.statement,
        reasons: parsed.error.issues.map((i) => `${i.path.join(".")} : ${i.message}`),
      });
      continue;
    }
    // 2. Vérifications par le code (notion, réponse acceptée par la correction, indices).
    const errors = checkExercise(parsed.data, ref);
    // 3. Vérification du calcul pour les réponses numériques.
    let mathCheck: GenerationMeta["mathCheck"] = "not_applicable";
    if (parsed.data.answer.type === "NUMERIC") {
      const check = checkNumericAnswer(
        ai.verificationExpression,
        parsed.data.answer.value,
        parsed.data.answer.tolerance,
      );
      mathCheck = check.status;
      if (check.status === "mismatch")
        errors.push(`le calcul donne ${check.computed}, pas ${parsed.data.answer.value}`);
    }
    if (errors.length > 0) discarded.push({ statement: ai.statement, reasons: errors });
    else candidates.push({ content: parsed.data, mathCheck });
  }

  // 4. Relecture par un second appel (en parallèle).
  const reviews = await Promise.all(
    candidates.map((c) =>
      llm.structured({
        feature: "EXERCISE_REVIEW",
        model: reviewModel,
        promptVersion: EXERCISE_REVIEW_V1.version,
        system: EXERCISE_REVIEW_V1.system,
        user: buildReviewRequest({
          levelLabel: t(`levels.${notion.level}`),
          notionTitle: notion.title,
          exerciseJson: JSON.stringify({
            statement: c.content.statement,
            answer: c.content.answer,
            hints: c.content.hints,
            explanation: c.content.explanation,
          }),
        }),
        schema: aiReviewSchema,
        effort: "medium",
        maxTokens: 8000,
      }),
    ),
  );

  const accepted: AcceptedExercise[] = [];
  candidates.forEach((c, i) => {
    const review = reviews[i]?.data ?? null;
    if (review?.verdict === "reject" || review?.answerCorrect === false) {
      discarded.push({
        statement: c.content.statement,
        reasons: ["refusé à la relecture", ...(review?.issues ?? [])],
      });
      return;
    }
    const reviewOk =
      review !== null &&
      review.verdict === "approve" &&
      review.unambiguous &&
      review.levelAppropriate &&
      review.hintsOk;
    // Une réponse numérique non vérifiable par le calcul passe toujours par un humain.
    const mathOk = c.mathCheck === "match" || c.mathCheck === "not_applicable";
    accepted.push({
      content: c.content,
      status: reviewOk && mathOk ? "AUTO_VALIDATED" : "DRAFT",
      meta: {
        model: generationModel,
        promptVersion: EXERCISE_GENERATION_V1.version,
        reviewModel,
        reviewPromptVersion: EXERCISE_REVIEW_V1.version,
        mathCheck: c.mathCheck,
        review,
      },
    });
  });

  return { accepted, discarded, generationFailed: false };
}
