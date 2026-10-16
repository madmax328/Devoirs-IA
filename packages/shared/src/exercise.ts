import { z } from "zod";
import { SCHOOL_LEVELS } from "./constants";
import { NOTION_ID_REGEX } from "./notion";

export const EXERCISE_TYPES = [
  "MCQ",
  "NUMERIC",
  "FILL_BLANKS",
  "MATCHING",
  "ORDERING",
  "TRUE_FALSE",
  "SHORT_TEXT",
] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const EXERCISE_STATUSES = ["DRAFT", "AUTO_VALIDATED", "HUMAN_VALIDATED", "REJECTED"] as const;
export type ExerciseStatus = (typeof EXERCISE_STATUSES)[number];
/** Statuts qu'on peut servir aux enfants. */
export const SERVABLE_STATUSES: readonly ExerciseStatus[] = ["AUTO_VALIDATED", "HUMAN_VALIDATED"];

export const NUMERIC_FORMATS = ["any", "integer", "decimal", "fraction_simplified"] as const;

// ───────── Données de réponse (ce que l'exercice attend), une forme par type

export const mcqAnswerSchema = z
  .object({
    type: z.literal("MCQ"),
    choices: z.array(z.string().min(1)).min(2).max(6),
    /** Indices des bonnes réponses (plusieurs si `multiple`). */
    correct: z.array(z.number().int().min(0)).min(1),
    multiple: z.boolean(),
  })
  .refine((a) => a.correct.every((i) => i < a.choices.length), "Indice de bonne réponse hors des choix")
  .refine((a) => a.multiple || a.correct.length === 1, "Une seule bonne réponse si multiple = false")
  .refine(
    (a) => new Set(a.choices.map((c) => c.trim().toLowerCase())).size === a.choices.length,
    "Choix en double",
  );

export const numericAnswerSchema = z.object({
  type: z.literal("NUMERIC"),
  /** Valeur exacte attendue : entier, décimal ("3,5" ou "3.5") ou fraction ("7/2"). */
  value: z.string().regex(/^-?\d+([.,]\d+)?(\/\d+)?$/, "Valeur numérique invalide"),
  /** Écart absolu toléré (valeurs approchées). 0 = valeur exacte. */
  tolerance: z.number().min(0),
  /** Unité attendue, facultative (ex. "cm"). */
  unit: z.string().max(10).nullable(),
  format: z.enum(NUMERIC_FORMATS),
});

export const fillBlanksAnswerSchema = z
  .object({
    type: z.literal("FILL_BLANKS"),
    /** Texte avec des trous notés [[1]], [[2]]… */
    text: z.string().min(5),
    blanks: z
      .array(
        z.object({
          id: z.string().regex(/^\d+$/),
          accepted: z.array(z.string().min(1)).min(1),
          /** Les accents comptent (ex. « a » vs « à » en français). */
          accentSensitive: z.boolean(),
        }),
      )
      .min(1),
  })
  .refine(
    (a) => a.blanks.every((b) => a.text.includes(`[[${b.id}]]`)),
    "Chaque trou doit apparaître dans le texte sous la forme [[id]]",
  );

export const matchingAnswerSchema = z
  .object({
    type: z.literal("MATCHING"),
    left: z.array(z.string().min(1)).min(2).max(8),
    right: z.array(z.string().min(1)).min(2).max(8),
    /** Paires correctes [indice gauche, indice droite]. */
    pairs: z.array(z.tuple([z.number().int().min(0), z.number().int().min(0)])).min(2),
  })
  .refine((a) => a.pairs.every(([l, r]) => l < a.left.length && r < a.right.length), "Paire hors limites")
  .refine(
    (a) => new Set(a.pairs.map(([l]) => l)).size === a.pairs.length,
    "Un élément de gauche apparaît deux fois",
  );

export const orderingAnswerSchema = z.object({
  type: z.literal("ORDERING"),
  /** Éléments dans le BON ordre (ils sont mélangés à l'affichage). */
  items: z.array(z.string().min(1)).min(3).max(8),
});

export const trueFalseAnswerSchema = z.object({
  type: z.literal("TRUE_FALSE"),
  correct: z.boolean(),
  requireJustification: z.boolean(),
  /** Éléments attendus dans la justification (corrigée par l'IA). */
  expectedJustification: z.string().nullable(),
});

export const shortTextAnswerSchema = z.object({
  type: z.literal("SHORT_TEXT"),
  /** Réponse modèle (jamais montrée telle quelle avant que l'enfant ait répondu). */
  modelAnswer: z.string().min(3),
  /** Critères de réussite pour la correction par l'IA. */
  criteria: z.array(z.string().min(3)).min(1).max(5),
});

export const answerSchema = z.union([
  mcqAnswerSchema,
  numericAnswerSchema,
  fillBlanksAnswerSchema,
  matchingAnswerSchema,
  orderingAnswerSchema,
  trueFalseAnswerSchema,
  shortTextAnswerSchema,
]);
export type AnswerData = z.infer<typeof answerSchema>;
export type AnswerOf<T extends ExerciseType> = Extract<AnswerData, { type: T }>;

// ───────── Contenu d'un exercice

export const exerciseContentSchema = z
  .object({
    notionIds: z.array(z.string().regex(NOTION_ID_REGEX)).min(1).max(3),
    level: z.enum(SCHOOL_LEVELS),
    /** 1 = très facile … 5 = difficile, à l'intérieur du niveau. */
    difficulty: z.number().int().min(1).max(5),
    statement: z.string().min(5).max(1500),
    answer: answerSchema,
    /** Explication courte montrée après la réponse. */
    explanation: z.string().min(5).max(800),
    /** Indices gradués : piste générale → méthode → exemple similaire. Jamais la réponse. */
    hints: z.array(z.string().min(3)).length(3),
  })
  .refine((e) => e.statement.trim().length > 0, "Énoncé vide");
export type ExerciseContent = z.infer<typeof exerciseContentSchema>;

// ───────── Réponses de l'élève

export const studentResponseSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("MCQ"), selected: z.array(z.number().int().min(0)) }),
  z.object({ type: z.literal("NUMERIC"), value: z.string().max(40) }),
  z.object({ type: z.literal("FILL_BLANKS"), values: z.record(z.string(), z.string().max(80)) }),
  z.object({
    type: z.literal("MATCHING"),
    pairs: z.array(z.tuple([z.number().int().min(0), z.number().int().min(0)])),
  }),
  z.object({ type: z.literal("ORDERING"), order: z.array(z.string()) }),
  z.object({
    type: z.literal("TRUE_FALSE"),
    value: z.boolean(),
    justification: z.string().max(600).optional(),
  }),
  z.object({ type: z.literal("SHORT_TEXT"), text: z.string().max(1500) }),
]);
export type StudentResponse = z.infer<typeof studentResponseSchema>;

export const exerciseReportSchema = z.object({
  reason: z.enum(["WRONG_ANSWER", "UNCLEAR", "TOO_HARD", "TYPO", "OTHER"]),
  comment: z.string().trim().max(500).optional(),
});
export type ExerciseReportInput = z.infer<typeof exerciseReportSchema>;
