import { equals, parseNumber } from "@devoirs/pedagogy";

/** Tous les nombres présents dans un texte (« 3,5 », « 7/2 », « -4 »…). */
export function numbersIn(text: string): string[] {
  return text.match(/-?\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?/g) ?? [];
}

/**
 * Le message du coach révèle-t-il la réponse numérique attendue ?
 * Si l'élève l'a déjà écrite lui-même, la confirmer n'est pas une fuite.
 */
export function revealsNumericAnswer(reply: string, expected: string, childText = ""): boolean {
  const target = parseNumber(expected);
  if (!target) return false;
  const matches = (text: string) =>
    numbersIn(text).some((n) => {
      const v = parseNumber(n);
      return v !== null && equals(v.value, target.value);
    });
  return matches(reply) && !matches(childText);
}
