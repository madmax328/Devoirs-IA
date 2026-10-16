import { z } from "zod";
import { SUBJECTS } from "./constants";
import { EXERCISE_TYPES, NUMERIC_FORMATS, studentResponseSchema } from "./exercise";

/**
 * Exercice tel qu'il est envoyé à l'élève : AUCUNE donnée de réponse
 * (ni bonne réponse, ni réponses acceptées, ni paires, ni ordre correct).
 */
export const publicExerciseSchema = z.object({
  id: z.string(),
  type: z.enum(EXERCISE_TYPES),
  statement: z.string(),
  payload: z.discriminatedUnion("type", [
    z.object({ type: z.literal("MCQ"), choices: z.array(z.string()), multiple: z.boolean() }),
    z.object({ type: z.literal("NUMERIC"), unit: z.string().nullable(), format: z.enum(NUMERIC_FORMATS) }),
    z.object({
      type: z.literal("FILL_BLANKS"),
      /** Texte découpé : morceaux de texte et trous à remplir, dans l'ordre. */
      segments: z.array(z.union([z.object({ text: z.string() }), z.object({ blankId: z.string() })])),
    }),
    z.object({
      type: z.literal("MATCHING"),
      left: z.array(z.string()),
      /** Colonne de droite mélangée ; `index` est l'indice d'origine à renvoyer dans la réponse. */
      right: z.array(z.object({ index: z.number().int(), label: z.string() })),
    }),
    z.object({ type: z.literal("ORDERING"), items: z.array(z.string()) }),
    z.object({ type: z.literal("TRUE_FALSE"), requireJustification: z.boolean() }),
    z.object({ type: z.literal("SHORT_TEXT") }),
  ]),
});
export type PublicExercise = z.infer<typeof publicExerciseSchema>;
export type PublicPayload<T extends PublicExercise["payload"]["type"]> = Extract<
  PublicExercise["payload"],
  { type: T }
>;

// ───────── Diagnostic

export const MASTERY_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "MASTERED"] as const;
export type MasteryStatus = (typeof MASTERY_STATUSES)[number];

export const DIAGNOSTIC_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "UNAVAILABLE"] as const;
export type DiagnosticStatus = (typeof DIAGNOSTIC_STATUSES)[number];

export const diagnosticStartSchema = z.object({ subject: z.enum(SUBJECTS) });

export const diagnosticAnswerSchema = z.union([
  z.object({
    exerciseId: z.string(),
    response: studentResponseSchema,
    durationMs: z.number().int().min(0).max(3_600_000).optional(),
  }),
  z.object({
    exerciseId: z.string(),
    skipped: z.literal(true),
    durationMs: z.number().int().min(0).max(3_600_000).optional(),
  }),
]);
export type DiagnosticAnswerInput = z.infer<typeof diagnosticAnswerSchema>;

export interface DiagnosticProgress {
  asked: number;
  max: number;
}

export interface DiagnosticNotionSummary {
  id: string;
  title: string;
}

export interface DiagnosticSummary {
  mastered: DiagnosticNotionSummary[];
  /** Notions à travailler, en commençant par les bases (lacunes racines). */
  toWork: DiagnosticNotionSummary[];
}

export interface DiagnosticOverviewItem {
  subject: (typeof SUBJECTS)[number];
  status: DiagnosticStatus;
  sessionId: string | null;
  progress: DiagnosticProgress | null;
  summary: DiagnosticSummary | null;
}

/** Réponse de l'API après démarrage ou après une réponse. */
export interface DiagnosticStep {
  sessionId: string;
  subject: (typeof SUBJECTS)[number];
  /** Retour sur la réponse précédente (absent au démarrage). */
  feedback: DiagnosticFeedback | null;
  /** Exercice suivant, ou null si le diagnostic est terminé. */
  exercise: PublicExercise | null;
  progress: DiagnosticProgress;
  summary: DiagnosticSummary | null;
}

export interface DiagnosticFeedback {
  /** « retry » : saisie illisible, l'élève peut corriger sans que ça compte. */
  kind: "good" | "partial" | "notYet" | "skipped" | "retry";
  /** Clé i18n du message. */
  messageKey: string;
}
