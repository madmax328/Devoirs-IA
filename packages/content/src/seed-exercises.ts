import { correct, referenceResponse } from "@devoirs/pedagogy";
import { exerciseContentSchema, type ExerciseContent } from "@devoirs/shared";
import { z } from "zod";
import { RAW_EXERCISE_FILES } from "./files.generated";
import { fingerprint, referentiel, type Referentiel } from "./referentiel";

/** Exercices écrits dans le dépôt : `key` est stable et sert à les mettre à jour sans doublon. */
export const seedExerciseFileSchema = z.object({
  exercises: z.array(exerciseContentSchema.and(z.object({ key: z.string().regex(/^[a-z0-9-]+$/) }))),
});
export type SeedExercise = ExerciseContent & { key: string };

/**
 * Vérifications d'un exercice, communes aux exercices du dépôt et à ceux générés par l'IA :
 * notions connues, niveau cohérent, réponse de référence acceptée par le moteur de correction,
 * et indices qui ne recopient pas la réponse.
 */
export function checkExercise(ex: ExerciseContent, ref: Referentiel = referentiel()): string[] {
  const errors: string[] = [];
  for (const id of ex.notionIds) if (!ref.byId.has(id)) errors.push(`notion inconnue : ${id}`);
  const main = ref.byId.get(ex.notionIds[0] ?? "");
  if (main && main.level !== ex.level)
    errors.push(`niveau ${ex.level} différent de celui de la notion principale (${main.level})`);

  const check = correct(ex.answer, referenceResponse(ex.answer));
  if (
    ex.answer.type !== "SHORT_TEXT" &&
    !(ex.answer.type === "TRUE_FALSE" && ex.answer.requireJustification)
  ) {
    if (check.outcome !== "correct")
      errors.push(`la réponse attendue n'est pas acceptée par la correction (${check.feedback})`);
  }

  // Un indice ne doit jamais contenir la réponse elle-même.
  const secret = ex.answer.type === "NUMERIC" ? ex.answer.value : null;
  if (
    secret &&
    ex.hints.some((h) =>
      new RegExp(`(^|[^\\d,./])${secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\d,/]|$)`).test(h),
    )
  ) {
    errors.push("un indice contient la réponse");
  }
  return errors;
}

export function seedExercises(): SeedExercise[] {
  return RAW_EXERCISE_FILES.flatMap((raw) => seedExerciseFileSchema.parse(raw).exercises);
}

export function seedExercisesVersion(): string {
  return fingerprint(JSON.stringify(seedExercises()));
}
