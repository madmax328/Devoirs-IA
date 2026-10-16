import { describe, expect, it } from "vitest";
import {
  INITIAL_MASTERY,
  attemptWeight,
  expectedScore,
  masteryProbability,
  masteryStatus,
  ratingFromDifficulty,
  updateMastery,
} from "../src";

describe("modèle de maîtrise (Elo)", () => {
  it("50 % de chances face à un exercice de même niveau", () => {
    expect(expectedScore(0, 0)).toBeCloseTo(0.5);
    expect(expectedScore(200, 0)).toBeGreaterThan(0.7);
  });

  it("la difficulté 1..5 est centrée sur 3", () => {
    expect([1, 3, 5].map(ratingFromDifficulty)).toEqual([-400, 0, 400]);
  });

  it("une réussite fait monter le score, un échec le fait baisser", () => {
    const up = updateMastery(INITIAL_MASTERY, 0, 1, 1).child;
    const down = updateMastery(INITIAL_MASTERY, 0, 0, 1).child;
    expect(up.rating).toBeGreaterThan(0);
    expect(down.rating).toBeLessThan(0);
    expect(up.observations).toBe(1);
  });

  it("réussir un exercice difficile rapporte plus qu'un facile", () => {
    const hard = updateMastery(INITIAL_MASTERY, ratingFromDifficulty(5), 1, 1).child.rating;
    const easy = updateMastery(INITIAL_MASTERY, ratingFromDifficulty(1), 1, 1).child.rating;
    expect(hard).toBeGreaterThan(easy);
  });

  it("une réussite avec beaucoup d'indices (devoir aidé) compte moins", () => {
    const alone = updateMastery(INITIAL_MASTERY, 0, 1, attemptWeight("session", 0)).child.rating;
    const helped = updateMastery(INITIAL_MASTERY, 0, 1, attemptWeight("homework", 3)).child.rating;
    expect(helped).toBeLessThan(alone / 3);
    expect(attemptWeight("homework", 10)).toBeGreaterThan(0);
  });

  it("une preuve indirecte (prérequis inféré) ne compte pas comme une observation", () => {
    expect(updateMastery(INITIAL_MASTERY, 0, 1, attemptWeight("inferred")).child.observations).toBe(0);
  });

  it("le score se stabilise : les premières réponses font bouger plus que les suivantes", () => {
    let m = INITIAL_MASTERY;
    const deltas: number[] = [];
    for (let i = 0; i < 5; i++) {
      const next = updateMastery(m, m.rating, 1, 1).child; // exercice toujours à son niveau
      deltas.push(next.rating - m.rating);
      m = next;
    }
    expect(deltas[0]).toBeGreaterThan(deltas[4]!);
  });

  it("l'exercice raté par un bon élève devient « plus difficile »", () => {
    expect(updateMastery({ rating: 300, observations: 5 }, 0, 0, 1).exerciseRating).toBeGreaterThan(0);
  });

  it("statuts : à découvrir, en cours, maîtrisée", () => {
    expect(masteryStatus(null)).toBe("NOT_STARTED");
    expect(masteryStatus(INITIAL_MASTERY)).toBe("NOT_STARTED");
    expect(masteryStatus(updateMastery(INITIAL_MASTERY, 0, 0, 1).child)).toBe("IN_PROGRESS");
    expect(masteryStatus(updateMastery(INITIAL_MASTERY, 0, 1, 1).child)).toBe("MASTERED");
    expect(masteryProbability(0)).toBeCloseTo(0.5);
  });
});
