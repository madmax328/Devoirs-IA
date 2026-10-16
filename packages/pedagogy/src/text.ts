/** Normalise une réponse courte pour la comparer (casse, espaces, apostrophes, ponctuation finale). */
export function normalizeText(input: string, { accentSensitive }: { accentSensitive: boolean }): string {
  let s = input
    .normalize("NFC")
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?;:]+$/, "")
    .trim();
  if (!accentSensitive) {
    s = s.replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  return s;
}
