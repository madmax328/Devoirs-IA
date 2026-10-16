import { describe, expect, it } from "vitest";
import { checkExercise, seedExercises } from "../src";

describe("exercices du dépôt", () => {
  const all = seedExercises();

  it("existent pour les maths et le français", () => {
    expect(all.filter((e) => e.key.startsWith("ma-")).length).toBeGreaterThanOrEqual(30);
    expect(all.filter((e) => e.key.startsWith("fr-")).length).toBeGreaterThanOrEqual(15);
  });

  it("ont des clés uniques", () => {
    expect(new Set(all.map((e) => e.key)).size).toBe(all.length);
  });

  it.each(all.map((e) => [e.key, e] as const))("%s passe toutes les vérifications", (_key, ex) => {
    expect(checkExercise(ex)).toEqual([]);
  });
});

describe("checkExercise", () => {
  const base = {
    notionIds: ["ma.6e.priorites-operatoires"],
    level: "SIXIEME" as const,
    difficulty: 2,
    statement: "Calcule 5 + 3 × 4",
    explanation: "La multiplication d'abord.",
  };
  it("refuse un indice qui contient la réponse", () => {
    const ex = {
      ...base,
      answer: { type: "NUMERIC" as const, value: "17", tolerance: 0, unit: null, format: "any" as const },
      hints: ["Multiplie d'abord.", "3 × 4 = 12", "La réponse est 17."],
    };
    expect(checkExercise(ex)).toContain("un indice contient la réponse");
  });
  it("refuse une notion inconnue et un niveau incohérent", () => {
    const ex = {
      ...base,
      notionIds: ["ma.5e.relatifs-sens"],
      answer: { type: "NUMERIC" as const, value: "17", tolerance: 0, unit: null, format: "any" as const },
      hints: ["a b c", "d e f", "g h i"],
    };
    expect(checkExercise(ex).some((e) => e.includes("niveau"))).toBe(true);
  });
});
