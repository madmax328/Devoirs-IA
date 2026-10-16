import { z } from "zod";
import type { SCHOOL_LEVELS, SUBJECTS } from "./constants";

export const MAX_HOMEWORK_PHOTOS = 3;
/**
 * Taille max d'une photo après compression, encodée en base64 (~1 Mo d'image).
 * 3 photos doivent tenir sous la limite de 4,5 Mo des requêtes sur Vercel.
 */
export const MAX_PHOTO_BASE64_LENGTH = 1_300_000;
export const MAX_CHILD_MESSAGE_LENGTH = 1000;

export const homeworkPhotoSchema = z.object({
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  base64: z
    .string()
    .min(100)
    .max(MAX_PHOTO_BASE64_LENGTH)
    .regex(/^[A-Za-z0-9+/=]+$/, "errors.generic"),
});
export type HomeworkPhotoInput = z.infer<typeof homeworkPhotoSchema>;

export const createHomeworkSchema = z
  .object({
    photos: z.array(homeworkPhotoSchema).max(MAX_HOMEWORK_PHOTOS).default([]),
    text: z.string().trim().max(4000).nullable().default(null),
  })
  .refine((v) => v.photos.length > 0 || (v.text?.length ?? 0) > 0, "homework.needInput");
export type CreateHomeworkInput = z.infer<typeof createHomeworkSchema>;

export const confirmHomeworkSchema = z.object({
  /** L'enfant a corrigé l'énoncé lu par l'IA (sinon null). */
  correctedStatement: z.string().trim().min(5).max(4000).nullable().default(null),
});

export const homeworkMessageSchema = z.object({
  action: z.enum(["message", "hint", "stuck"]),
  text: z.string().trim().max(MAX_CHILD_MESSAGE_LENGTH).default(""),
});
export type HomeworkMessageInput = z.infer<typeof homeworkMessageSchema>;

export const HOMEWORK_STATUSES = [
  "UNREADABLE",
  "TO_CONFIRM",
  "IN_PROGRESS",
  "COMPLETED",
  "ABANDONED",
  "SAFETY_STOP",
  "OUT_OF_SCOPE",
] as const;
export type HomeworkStatusName = (typeof HOMEWORK_STATUSES)[number];

/** Ce que l'enfant voit de l'analyse : jamais les réponses ni les étapes de solution. */
export interface HomeworkAnalysisView {
  subject: (typeof SUBJECTS)[number] | null;
  level: (typeof SCHOOL_LEVELS)[number] | null;
  exerciseKind: string;
  statement: string;
  notions: { id: string; title: string }[];
  questionCount: number;
  unreadableReason: string | null;
  outOfScope: "none" | "above_level" | "below_level" | "not_school";
}

export interface HomeworkMessageView {
  id: string;
  role: "child" | "coach";
  action: "start" | "message" | "hint" | "stuck" | null;
  text: string;
  hintLevel: number | null;
  safety: "distress" | "inappropriate" | null;
  createdAt: string;
}

export interface HomeworkView {
  id: string;
  status: HomeworkStatusName;
  createdAt: string;
  photoCount: number;
  analysis: HomeworkAnalysisView | null;
  messages: HomeworkMessageView[];
  recap: { learned: string[]; notionsToWork: { id: string; title: string }[] } | null;
  hintsUsed: number;
}

export interface HomeworkListItem {
  id: string;
  status: HomeworkStatusName;
  createdAt: string;
  subject: (typeof SUBJECTS)[number] | null;
  exerciseKind: string | null;
}
