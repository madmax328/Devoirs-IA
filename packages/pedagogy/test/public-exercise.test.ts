import type { AnswerData } from "@devoirs/shared";
import { publicExerciseSchema } from "@devoirs/shared";
import { describe, expect, it } from "vitest";
import { correct, shuffle, splitBlanks, toPublicExercise } from "../src";

const answers: AnswerData[] = [
  { type: "MCQ", choices: ["2", "3", "4"], correct: [1], multiple: false },
  { type: "NUMERIC", value: "17", tolerance: 0, unit: "cm", format: "any" },
  {
    type: "FILL_BLANKS",
    text: "Il [[1]] beau et nous [[2]].",
    blanks: [
      { id: "1", accepted: ["fait"], accentSensitive: true },
      { id: "2", accepted: ["sortons"], accentSensitive: true },
    ],
  },
  {
    type: "MATCHING",
    left: ["1/2", "1/4", "3/4"],
    right: ["0,5", "0,25", "0,75"],
    pairs: [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
  },
  { type: "ORDERING", items: ["a", "b", "c", "d"] },
  { type: "TRUE_FALSE", correct: true, requireJustification: false, expectedJustification: null },
];

describe("exercice envoyé à l'élève", () => {
  it.each(answers.map((a) => [a.type, a] as const))(
    "%s : ne contient aucune donnée de réponse",
    (_t, answer) => {
      const pub = toPublicExercise({ id: "x", statement: "Énoncé", answer }, "seed");
      expect(publicExerciseSchema.safeParse(pub).success).toBe(true);
      const json = JSON.stringify(pub);
      for (const secret of [
        '"correct"',
        '"accepted"',
        '"pairs"',
        '"value"',
        '"expectedJustification"',
        '"modelAnswer"',
      ]) {
        expect(json).not.toContain(secret);
      }
    },
  );

  it("mélange l'ordre (jamais l'ordre correct) de façon stable", () => {
    const answer = answers[4]!;
    const a = toPublicExercise({ id: "x", statement: "s", answer }, "graine");
    const b = toPublicExercise({ id: "x", statement: "s", answer }, "graine");
    expect(a).toEqual(b);
    if (a.payload.type !== "ORDERING") throw new Error("type");
    expect(a.payload.items).not.toEqual(["a", "b", "c", "d"]);
    expect([...a.payload.items].sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("appariement : la colonne de droite est mélangée mais garde ses indices d'origine pour la correction", () => {
    const answer = answers[3]!;
    const pub = toPublicExercise({ id: "x", statement: "s", answer }, "g");
    if (pub.payload.type !== "MATCHING") throw new Error("type");
    expect(pub.payload.right.map((r) => r.index)).not.toEqual([0, 1, 2]);
    // L'élève associe chaque élément de gauche à l'élément de droite de même valeur.
    const pairs = pub.payload.left.map(
      (_, li) =>
        [
          li,
          pub.payload.type === "MATCHING"
            ? pub.payload.right.find((r) => r.label === (answer as { right: string[] }).right[li])!.index
            : 0,
        ] as [number, number],
    );
    expect(correct(answer, { type: "MATCHING", pairs }).outcome).toBe("correct");
  });

  it("découpe le texte à trous", () => {
    expect(splitBlanks("Il [[1]] beau.")).toEqual([{ text: "Il " }, { blankId: "1" }, { text: " beau." }]);
    expect(splitBlanks("[[1]] et [[2]]")).toEqual([{ blankId: "1" }, { text: " et " }, { blankId: "2" }]);
  });

  it("mélange de façon déterministe", () => {
    expect(shuffle([1, 2, 3, 4, 5], "a")).toEqual(shuffle([1, 2, 3, 4, 5], "a"));
  });
});
