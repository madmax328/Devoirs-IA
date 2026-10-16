/**
 * Masquage automatique des informations personnelles dans les messages de l'enfant,
 * AVANT envoi à l'IA et AVANT stockage. Volontairement large : mieux vaut masquer trop que pas assez.
 */
export type PiiKind = "email" | "phone" | "url" | "handle" | "address" | "postcode" | "name" | "school";

export const MASK = "[information masquée]";

const RULES: { kind: PiiKind; re: RegExp; group?: number }[] = [
  { kind: "email", re: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { kind: "url", re: /\bhttps?:\/\/\S+|\bwww\.\S+/gi },
  { kind: "phone", re: /(?:\+33\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/g },
  { kind: "handle", re: /(?<![\w.])@[A-Za-z0-9_.]{2,}/g },
  {
    kind: "address",
    re: /\b\d{1,4}\s?(?:bis|ter)?\s?,?\s?(?:rue|avenue|av\.|boulevard|bd|chemin|allée|impasse|place|route|quai|résidence|lotissement)\s+[^\n,.;!?]{2,40}/giu,
  },
  { kind: "postcode", re: /\b\d{5}\s+[A-ZÀ-Ý][\p{L}'-]+(?:[\s-][A-ZÀ-Ý][\p{L}'-]+)*/gu },
  {
    kind: "name",
    re: /\b(je m'appelle|je m’appelle|mon nom(?: de famille)? (?:c'est|est)|mon prénom (?:c'est|est)|moi c'est)\s+([A-ZÀ-Ýa-zà-ÿ][\p{L}'-]+(?:\s+[A-ZÀ-Ý][\p{L}'-]+)?)/giu,
    group: 2,
  },
  {
    kind: "school",
    re: /\b((?:au |à l'|mon |ma |le |la )?(?:collège|école|lycée))\s+((?:[A-ZÀ-Ý][\p{L}'-]+)(?:[\s-](?:de |du |des |d')?[A-ZÀ-Ý][\p{L}'-]+){0,3})/gu,
    group: 2,
  },
];

export function maskPersonalInfo(text: string): { text: string; found: PiiKind[] } {
  const found = new Set<PiiKind>();
  let out = text;
  for (const rule of RULES) {
    out = out.replace(rule.re, (match: string, ...groups: unknown[]) => {
      found.add(rule.kind);
      if (rule.group === undefined) return MASK;
      const captured = groups[rule.group - 1];
      return typeof captured === "string" ? match.replace(captured, MASK) : MASK;
    });
  }
  return { text: out, found: [...found] };
}
