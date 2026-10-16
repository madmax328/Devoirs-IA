import { z } from "zod";
import { SCHOOL_LEVELS, SUBJECTS, type SchoolLevel } from "./constants";

/** Identifiant stable : "<matière>.<niveau>.<slug>", ex. "ma.6e.fractions-partage". */
export const NOTION_ID_REGEX = /^(ma|fr|an|hg|svt|pc)\.(cm2|6e|5e|4e|3e)\.[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SUBJECT_CODES = {
  ma: "MATHS",
  fr: "FRANCAIS",
  an: "ANGLAIS",
  hg: "HIST_GEO_EMC",
  svt: "SVT",
  pc: "PHYSIQUE_CHIMIE",
} as const;
export const LEVEL_CODES = {
  cm2: "CM2",
  "6e": "SIXIEME",
  "5e": "CINQUIEME",
  "4e": "QUATRIEME",
  "3e": "TROISIEME",
} as const;

export type Cycle = 3 | 4;
/** Cycle 3 = CM1, CM2, 6e ; cycle 4 = 5e, 4e, 3e. */
export const cycleOf = (level: SchoolLevel): Cycle => (level === "CM2" || level === "SIXIEME" ? 3 : 4);
export const levelRank = (level: SchoolLevel): number => SCHOOL_LEVELS.indexOf(level);

export const notionSchema = z.object({
  id: z.string().regex(NOTION_ID_REGEX),
  subject: z.enum(SUBJECTS),
  level: z.enum(SCHOOL_LEVELS),
  /** Grand domaine du programme, ex. « Nombres et calculs ». */
  theme: z.string().min(2),
  title: z.string().min(3).max(90),
  description: z.string().min(10).max(400),
  prerequisites: z.array(z.string().regex(NOTION_ID_REGEX)),
  commonMistakes: z.array(z.string().min(5)).min(1),
  examples: z.array(z.string().min(3)).min(1),
});
export type Notion = z.infer<typeof notionSchema>;

/** Format des fichiers du référentiel : une matière et un niveau par fichier. */
export const referentielFileSchema = z.object({
  subject: z.enum(SUBJECTS),
  level: z.enum(SCHOOL_LEVELS),
  notions: z.array(notionSchema.omit({ subject: true, level: true })).min(1),
});
export type ReferentielFile = z.infer<typeof referentielFileSchema>;
