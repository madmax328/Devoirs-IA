import type { MasteryStatus } from "@devoirs/shared";

/**
 * Modèle de maîtrise : un score de type Elo par enfant et par notion.
 *
 * Pourquoi Elo plutôt que BKT : le BKT demande d'ajuster 4 paramètres par notion avec des données
 * qu'on n'a pas encore ; l'Elo s'auto-calibre, tient compte de la difficulté de chaque exercice
 * et reste explicable (« plus tu réussis des exercices difficiles, plus ton score monte »).
 * Toutes les réponses sont conservées (answerAttempts) : on pourra recalculer avec un autre modèle.
 */

/** Échelle : 0 = niveau d'un exercice de difficulté moyenne (3/5). */
export const ELO_SCALE = 400;

/** Difficulté 1..5 → score Elo de l'exercice (-400 … +400). */
export const ratingFromDifficulty = (difficulty: number) => (difficulty - 3) * 200;

/** Probabilité de réussir un exercice de score `exerciseRating` quand on a le score `childRating`. */
export function expectedScore(childRating: number, exerciseRating: number): number {
  return 1 / (1 + 10 ** ((exerciseRating - childRating) / ELO_SCALE));
}

/** Facteur K : fort au début (peu d'informations), puis plus stable. */
export const kFactor = (observations: number) => 40 + 160 / (1 + observations);

export type AttemptContext = "diagnostic" | "session" | "homework" | "inferred";

/**
 * Poids d'une réponse : un devoir aidé compte moins qu'un exercice fait seul,
 * et chaque indice utilisé réduit encore le poids.
 */
export function attemptWeight(context: AttemptContext, hintsUsed = 0): number {
  const base = { diagnostic: 1, session: 1, homework: 0.5, inferred: 0.3 }[context];
  return base * Math.max(0.25, 1 - 0.25 * hintsUsed);
}

export interface MasteryValue {
  rating: number;
  observations: number;
}

export const INITIAL_MASTERY: MasteryValue = { rating: 0, observations: 0 };

/**
 * Met à jour le score de l'enfant (et, plus doucement, celui de l'exercice).
 * `score` est entre 0 et 1 (une réponse partielle compte partiellement).
 */
export function updateMastery(
  state: MasteryValue,
  exerciseRating: number,
  score: number,
  weight: number,
): { child: MasteryValue; exerciseRating: number } {
  const expected = expectedScore(state.rating, exerciseRating);
  const delta = kFactor(state.observations) * weight * (score - expected);
  return {
    child: {
      rating: Math.round((state.rating + delta) * 10) / 10,
      // Une preuve indirecte (inférée) ne compte pas comme une vraie observation.
      observations: state.observations + (weight >= 0.5 ? 1 : 0),
    },
    // L'exercice bouge peu : 16 points max par réponse.
    exerciseRating: Math.round((exerciseRating - 16 * weight * (score - expected)) * 10) / 10,
  };
}

/** Probabilité de réussir un exercice de difficulté moyenne. */
export const masteryProbability = (rating: number) => expectedScore(rating, 0);

/** Au-delà de 60 % de chances de réussir un exercice moyen, la notion est considérée comme maîtrisée. */
export const MASTERED_THRESHOLD = 0.6;

export function masteryStatus(m: MasteryValue | null | undefined): MasteryStatus {
  if (!m || (m.observations === 0 && m.rating === 0)) return "NOT_STARTED";
  return masteryProbability(m.rating) >= MASTERED_THRESHOLD && m.observations >= 1
    ? "MASTERED"
    : "IN_PROGRESS";
}
