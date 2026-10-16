import type { AnswerData } from "@devoirs/shared";
import { describe, expect, it } from "vitest";
import { correct, referenceResponse } from "../src";

const numeric = (
  value: string,
  format: "any" | "integer" | "decimal" | "fraction_simplified" = "any",
  extra = {},
) => ({ type: "NUMERIC", value, tolerance: 0, unit: null, format, ...extra }) as const satisfies AnswerData;

const num = (answer: AnswerData, v: string) => correct(answer, { type: "NUMERIC", value: v });

describe("réponse numérique", () => {
  it("accepte les écritures équivalentes", () => {
    for (const v of ["3,5", "3.5", "7/2", "14/4", " 3,50 "])
      expect(num(numeric("3,5"), v).outcome).toBe("correct");
  });
  it("dit « pas encore » sur une valeur fausse, sans donner la réponse", () => {
    expect(num(numeric("3,5"), "3,4")).toMatchObject({ outcome: "incorrect", feedback: "notYet", score: 0 });
  });
  it("signale une saisie illisible plutôt que de compter faux", () => {
    expect(num(numeric("12"), "douze")).toMatchObject({ outcome: "invalid", feedback: "unreadableNumber" });
  });
  it("fraction irréductible demandée : 6/8 est juste mais à simplifier", () => {
    const a = numeric("3/4", "fraction_simplified");
    expect(num(a, "3/4").outcome).toBe("correct");
    expect(num(a, "6/8")).toMatchObject({ outcome: "partial", feedback: "notSimplified" });
    expect(num(a, "0,75")).toMatchObject({ outcome: "partial", feedback: "expectedFraction" });
  });
  it("fraction irréductible demandée mais le résultat est entier : 2 convient", () => {
    expect(num(numeric("8/4", "fraction_simplified"), "2").outcome).toBe("correct");
  });
  it("écriture décimale demandée", () => {
    const a = numeric("0,75", "decimal");
    expect(num(a, "0.75").outcome).toBe("correct");
    expect(num(a, "3/4")).toMatchObject({ outcome: "partial", feedback: "expectedDecimal" });
  });
  it("entier demandé", () => {
    expect(num(numeric("12", "integer"), "12").outcome).toBe("correct");
    expect(num(numeric("12", "integer"), "24/2")).toMatchObject({ outcome: "correct" });
  });
  it("tolérance pour les valeurs approchées", () => {
    const a = numeric("31,4", "any", { tolerance: 0.1 });
    expect(num(a, "31,42").outcome).toBe("correct");
    expect(num(a, "31,6").outcome).toBe("incorrect");
  });
  it("gère l'unité attendue", () => {
    const a = numeric("12", "any", { unit: "cm" });
    expect(num(a, "12 cm").outcome).toBe("correct");
    expect(num(a, "12cm").outcome).toBe("correct");
    expect(num(a, "12").outcome).toBe("correct");
    expect(num(a, "12 m")).toMatchObject({ outcome: "invalid", feedback: "wrongUnit" });
  });
  it("nombres négatifs", () => {
    expect(num(numeric("-5"), "−5").outcome).toBe("correct");
    expect(num(numeric("-5"), "5").outcome).toBe("incorrect");
  });
});

describe("QCM", () => {
  const single: AnswerData = { type: "MCQ", choices: ["2", "3", "4"], correct: [1], multiple: false };
  const multi: AnswerData = { type: "MCQ", choices: ["a", "b", "c", "d"], correct: [0, 2], multiple: true };
  it("une seule bonne réponse", () => {
    expect(correct(single, { type: "MCQ", selected: [1] }).outcome).toBe("correct");
    expect(correct(single, { type: "MCQ", selected: [0] }).outcome).toBe("incorrect");
    expect(correct(single, { type: "MCQ", selected: [0, 1] }).outcome).toBe("invalid");
  });
  it("plusieurs bonnes réponses : partiel si incomplet, pénalité si case fausse", () => {
    expect(correct(multi, { type: "MCQ", selected: [0, 2] }).outcome).toBe("correct");
    expect(correct(multi, { type: "MCQ", selected: [0] })).toMatchObject({ outcome: "partial", score: 0.5 });
    expect(correct(multi, { type: "MCQ", selected: [0, 1] }).outcome).toBe("incorrect");
  });
});

describe("texte à trous", () => {
  const a: AnswerData = {
    type: "FILL_BLANKS",
    text: "Les enfants [[1]] dans la cour. Il [[2]] à Paris.",
    blanks: [
      { id: "1", accepted: ["jouent"], accentSensitive: true },
      { id: "2", accepted: ["est allé", "est parti"], accentSensitive: true },
    ],
  };
  it("accepte casse, espaces et ponctuation finale différents", () => {
    expect(correct(a, { type: "FILL_BLANKS", values: { "1": " Jouent ", "2": "est  allé." } }).outcome).toBe(
      "correct",
    );
  });
  it("indique quels trous sont à revoir", () => {
    expect(correct(a, { type: "FILL_BLANKS", values: { "1": "joue", "2": "est parti" } })).toMatchObject({
      outcome: "partial",
      itemsCorrect: [false, true],
    });
  });
  it("respecte les accents quand ils comptent", () => {
    expect(correct(a, { type: "FILL_BLANKS", values: { "1": "jouent", "2": "est alle" } }).outcome).toBe(
      "partial",
    );
    const b: AnswerData = { ...a, blanks: a.blanks.map((x) => ({ ...x, accentSensitive: false })) };
    expect(correct(b, { type: "FILL_BLANKS", values: { "1": "jouent", "2": "est alle" } }).outcome).toBe(
      "correct",
    );
  });
});

describe("appariement et ordre", () => {
  it("appariement : indique les paires à revoir", () => {
    const a: AnswerData = {
      type: "MATCHING",
      left: ["1/2", "1/4", "3/4"],
      right: ["0,75", "0,5", "0,25"],
      pairs: [
        [0, 1],
        [1, 2],
        [2, 0],
      ],
    };
    expect(
      correct(a, {
        type: "MATCHING",
        pairs: [
          [0, 1],
          [1, 2],
          [2, 0],
        ],
      }).outcome,
    ).toBe("correct");
    expect(
      correct(a, {
        type: "MATCHING",
        pairs: [
          [0, 1],
          [1, 0],
          [2, 2],
        ],
      }),
    ).toMatchObject({
      outcome: "partial",
      itemsCorrect: [true, false, false],
    });
  });
  it("remettre dans l'ordre", () => {
    const a: AnswerData = { type: "ORDERING", items: ["0,09", "0,9", "1,09", "1,9"] };
    expect(correct(a, { type: "ORDERING", order: ["0,09", "0,9", "1,09", "1,9"] }).outcome).toBe("correct");
    expect(correct(a, { type: "ORDERING", order: ["0,9", "0,09", "1,09", "1,9"] })).toMatchObject({
      outcome: "partial",
      score: 0.5,
    });
  });
});

describe("vrai/faux et réponses rédigées", () => {
  it("vrai/faux sans justification", () => {
    const a: AnswerData = {
      type: "TRUE_FALSE",
      correct: false,
      requireJustification: false,
      expectedJustification: null,
    };
    expect(correct(a, { type: "TRUE_FALSE", value: false }).outcome).toBe("correct");
    expect(correct(a, { type: "TRUE_FALSE", value: true }).outcome).toBe("incorrect");
  });
  it("vrai/faux justifié : la justification part à l'IA", () => {
    const a: AnswerData = {
      type: "TRUE_FALSE",
      correct: true,
      requireJustification: true,
      expectedJustification: "car…",
    };
    expect(correct(a, { type: "TRUE_FALSE", value: true, justification: "parce que" }).outcome).toBe(
      "pending_ai",
    );
  });
  it("réponse rédigée : correction par l'IA", () => {
    const a: AnswerData = { type: "SHORT_TEXT", modelAnswer: "Une phrase.", criteria: ["sujet"] };
    expect(correct(a, { type: "SHORT_TEXT", text: "x" }).outcome).toBe("pending_ai");
  });
  it("refuse une réponse d'un autre type", () => {
    expect(correct(numeric("1"), { type: "MCQ", selected: [0] }).feedback).toBe("typeMismatch");
  });
});

describe("referenceResponse", () => {
  it("la réponse de référence est toujours jugée correcte", () => {
    const answers: AnswerData[] = [
      numeric("7/3", "fraction_simplified"),
      { type: "MCQ", choices: ["a", "b"], correct: [1], multiple: false },
      { type: "ORDERING", items: ["a", "b", "c"] },
    ];
    for (const a of answers) expect(correct(a, referenceResponse(a)).outcome).toBe("correct");
  });
});
