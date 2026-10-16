import { all, create, type FactoryFunctionMap, type MathJsInstance } from "mathjs";
import { parseNumber, toNumber } from "@devoirs/pedagogy";

// Calcul en nombres flottants (π et racines carrées possibles), comparé avec une tolérance.
const math: MathJsInstance = create(all as FactoryFunctionMap, { number: "number" });

/** Remplace l'écriture française (virgule décimale, ×, ÷, −, ²…) par une expression lisible par mathjs. */
export function normalizeExpression(expr: string): string {
  return expr
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–]/g, "-")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/√/g, "sqrt")
    .replace(/π/g, "pi");
}

export type MathCheck =
  { status: "match" } | { status: "mismatch"; computed: string } | { status: "unverifiable"; reason: string };

/**
 * Vérifie par le calcul qu'une réponse numérique est juste :
 * l'IA fournit l'expression du calcul (ex. « 3/4 * 28 »), le code l'évalue et compare.
 */
export function checkNumericAnswer(
  expression: string | null,
  expectedValue: string,
  tolerance: number,
): MathCheck {
  if (!expression) return { status: "unverifiable", reason: "pas d'expression de vérification" };
  const expected = parseNumber(expectedValue);
  if (!expected) return { status: "unverifiable", reason: "valeur attendue illisible" };
  let computed: number;
  try {
    const result: unknown = math.evaluate(normalizeExpression(expression));
    computed = typeof result === "number" ? result : Number(result);
  } catch {
    return { status: "unverifiable", reason: "expression invalide" };
  }
  if (!Number.isFinite(computed)) return { status: "unverifiable", reason: "résultat non numérique" };
  const diff = Math.abs(computed - toNumber(expected.value));
  return diff <= Math.max(tolerance, 1e-9)
    ? { status: "match" }
    : { status: "mismatch", computed: String(computed) };
}
