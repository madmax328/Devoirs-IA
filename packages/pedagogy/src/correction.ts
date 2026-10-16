import type { AnswerData, AnswerOf, StudentResponse } from "@devoirs/shared";
import { closeTo, equals, parseNumber, reduce, type Rational } from "./rational";
import { normalizeText } from "./text";

/**
 * Codes de retour, traduits par l'interface (messages positifs : « pas encore » plutôt que « faux »).
 * On indique OÙ est l'erreur (trous, paires, positions), jamais la bonne réponse.
 */
export type Feedback =
  | "correct"
  | "notYet"
  | "partlyCorrect"
  | "notSimplified"
  | "expectedInteger"
  | "expectedDecimal"
  | "expectedFraction"
  | "unreadableNumber"
  | "wrongUnit"
  | "justificationPending"
  | "aiGradingPending"
  | "typeMismatch";

export type Outcome = "correct" | "partial" | "incorrect" | "pending_ai" | "invalid";

export interface CorrectionResult {
  outcome: Outcome;
  /** Entre 0 et 1. */
  score: number;
  feedback: Feedback;
  /** Pour les exercices à plusieurs éléments : chaque élément est-il juste ? (même ordre que l'affichage) */
  itemsCorrect?: boolean[];
}

const result = (
  outcome: Outcome,
  score: number,
  feedback: Feedback,
  itemsCorrect?: boolean[],
): CorrectionResult => ({
  outcome,
  score: Math.max(0, Math.min(1, score)),
  feedback,
  ...(itemsCorrect ? { itemsCorrect } : {}),
});

function correctMcq(answer: AnswerOf<"MCQ">, selected: number[]): CorrectionResult {
  const chosen = new Set(selected);
  const good = new Set(answer.correct);
  if (!answer.multiple) {
    if (chosen.size !== 1) return result("invalid", 0, "notYet");
    return good.has(selected[0] ?? -1) ? result("correct", 1, "correct") : result("incorrect", 0, "notYet");
  }
  const hits = [...chosen].filter((i) => good.has(i)).length;
  const wrong = chosen.size - hits;
  if (hits === good.size && wrong === 0) return result("correct", 1, "correct");
  const score = (hits - wrong) / good.size;
  return score > 0 ? result("partial", score, "partlyCorrect") : result("incorrect", 0, "notYet");
}

/** Retire l'unité attendue à la fin de la saisie (« 12 cm », « 12cm »). Renvoie null si une autre unité est écrite. */
function stripUnit(raw: string, unit: string | null): string | null {
  const s = raw.trim();
  const m = /^(.*?[\d)])\s*([a-zA-Zµ°²³%€$/.]+)$/.exec(s);
  if (!m) return s;
  const [, value = "", written = ""] = m;
  if (unit && written.toLowerCase().replace(/\.$/, "") === unit.toLowerCase()) return value;
  return null;
}

function correctNumeric(answer: AnswerOf<"NUMERIC">, raw: string): CorrectionResult {
  const withoutUnit = stripUnit(raw, answer.unit);
  if (withoutUnit === null) return result("invalid", 0, "wrongUnit");
  const parsed = parseNumber(withoutUnit);
  if (!parsed) return result("invalid", 0, "unreadableNumber");

  const expected = parseNumber(answer.value);
  if (!expected) throw new Error(`Valeur attendue illisible : ${answer.value}`);

  if (!closeTo(parsed.value, expected.value, answer.tolerance)) return result("incorrect", 0, "notYet");

  // La valeur est juste : on vérifie la forme demandée.
  switch (answer.format) {
    case "integer":
      return parsed.form === "integer" || parsed.value.num % parsed.value.den === 0n
        ? result("correct", 1, "correct")
        : result("partial", 0.5, "expectedInteger");
    case "decimal":
      return parsed.form === "fraction"
        ? result("partial", 0.5, "expectedDecimal")
        : result("correct", 1, "correct");
    case "fraction_simplified": {
      const target: Rational = reduce(expected.value);
      if (target.den === 1n) return result("correct", 1, "correct"); // un entier : toute écriture convient
      if (parsed.form !== "fraction") return result("partial", 0.5, "expectedFraction");
      return parsed.simplified && equals(parsed.value, target)
        ? result("correct", 1, "correct")
        : result("partial", 0.75, "notSimplified");
    }
    case "any":
      return result("correct", 1, "correct");
  }
}

function correctFillBlanks(
  answer: AnswerOf<"FILL_BLANKS">,
  values: Record<string, string>,
): CorrectionResult {
  const items = answer.blanks.map((blank) => {
    const given = values[blank.id];
    if (given === undefined) return false;
    const opts = { accentSensitive: blank.accentSensitive };
    const norm = normalizeText(given, opts);
    return blank.accepted.some((a) => normalizeText(a, opts) === norm);
  });
  const ok = items.filter(Boolean).length;
  if (ok === items.length) return result("correct", 1, "correct", items);
  return ok > 0
    ? result("partial", ok / items.length, "partlyCorrect", items)
    : result("incorrect", 0, "notYet", items);
}

function correctMatching(answer: AnswerOf<"MATCHING">, pairs: [number, number][]): CorrectionResult {
  const expected = new Map(answer.pairs.map(([l, r]) => [l, r]));
  const given = new Map(pairs.map(([l, r]) => [l, r]));
  // Un booléen par élément de gauche attendu, dans l'ordre d'affichage.
  const items = [...expected.entries()].sort(([a], [b]) => a - b).map(([l, r]) => given.get(l) === r);
  const ok = items.filter(Boolean).length;
  if (ok === items.length) return result("correct", 1, "correct", items);
  return ok > 0
    ? result("partial", ok / items.length, "partlyCorrect", items)
    : result("incorrect", 0, "notYet", items);
}

function correctOrdering(answer: AnswerOf<"ORDERING">, order: string[]): CorrectionResult {
  if (order.length !== answer.items.length) return result("invalid", 0, "notYet");
  const items = answer.items.map((item, i) => order[i] === item);
  const ok = items.filter(Boolean).length;
  if (ok === items.length) return result("correct", 1, "correct", items);
  return ok > 0
    ? result("partial", ok / items.length, "partlyCorrect", items)
    : result("incorrect", 0, "notYet", items);
}

function correctTrueFalse(answer: AnswerOf<"TRUE_FALSE">, value: boolean): CorrectionResult {
  if (value !== answer.correct) return result("incorrect", 0, "notYet");
  // Le vrai/faux est juste ; la justification sera évaluée par l'IA.
  return answer.requireJustification
    ? result("pending_ai", 0.5, "justificationPending")
    : result("correct", 1, "correct");
}

/**
 * Correction déterministe d'une réponse d'élève.
 * Les réponses rédigées (SHORT_TEXT, justifications) renvoient `pending_ai` : l'IA prend le relais.
 */
export function correct(answer: AnswerData, response: StudentResponse): CorrectionResult {
  if (answer.type !== response.type) return result("invalid", 0, "typeMismatch");
  switch (response.type) {
    case "MCQ":
      return correctMcq(answer as AnswerOf<"MCQ">, response.selected);
    case "NUMERIC":
      return correctNumeric(answer as AnswerOf<"NUMERIC">, response.value);
    case "FILL_BLANKS":
      return correctFillBlanks(answer as AnswerOf<"FILL_BLANKS">, response.values);
    case "MATCHING":
      return correctMatching(answer as AnswerOf<"MATCHING">, response.pairs);
    case "ORDERING":
      return correctOrdering(answer as AnswerOf<"ORDERING">, response.order);
    case "TRUE_FALSE":
      return correctTrueFalse(answer as AnswerOf<"TRUE_FALSE">, response.value);
    case "SHORT_TEXT":
      return result("pending_ai", 0, "aiGradingPending");
  }
}

/** La réponse « parfaite » à un exercice, pour vérifier qu'il est corrigeable (tests, validation). */
export function referenceResponse(answer: AnswerData): StudentResponse {
  switch (answer.type) {
    case "MCQ":
      return { type: "MCQ", selected: answer.correct };
    case "NUMERIC":
      return { type: "NUMERIC", value: answer.value };
    case "FILL_BLANKS":
      return {
        type: "FILL_BLANKS",
        values: Object.fromEntries(answer.blanks.map((b) => [b.id, b.accepted[0] ?? ""])),
      };
    case "MATCHING":
      return { type: "MATCHING", pairs: answer.pairs };
    case "ORDERING":
      return { type: "ORDERING", order: answer.items };
    case "TRUE_FALSE":
      return { type: "TRUE_FALSE", value: answer.correct, justification: answer.expectedJustification ?? "" };
    case "SHORT_TEXT":
      return { type: "SHORT_TEXT", text: answer.modelAnswer };
  }
}
