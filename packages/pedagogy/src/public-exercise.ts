import type { AnswerData, PublicExercise } from "@devoirs/shared";
import { shuffle } from "./random";

/** Mélange en évitant de retomber sur l'ordre d'origine (sinon l'exercice serait déjà résolu). */
function shuffleNotIdentity<T>(items: readonly T[], seed: string): T[] {
  if (items.length < 2) return [...items];
  for (let attempt = 0; attempt < 5; attempt++) {
    const s = shuffle(items, `${seed}:${attempt}`);
    if (s.some((x, i) => x !== items[i])) return s;
  }
  return [...items.slice(1), items[0]!];
}

/** Découpe « Le chat [[1]] sur le tapis » en morceaux de texte et trous. */
export function splitBlanks(text: string): ({ text: string } | { blankId: string })[] {
  const out: ({ text: string } | { blankId: string })[] = [];
  const re = /\[\[(\d+)\]\]/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ blankId: m[1]! });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** Version « élève » d'un exercice : tout ce qu'il faut pour répondre, rien qui donne la réponse. */
export function toPublicExercise(
  ex: { id: string; statement: string; answer: AnswerData },
  seed: string,
): PublicExercise {
  const a = ex.answer;
  const base = { id: ex.id, type: a.type, statement: ex.statement };
  switch (a.type) {
    case "MCQ":
      return { ...base, payload: { type: "MCQ", choices: a.choices, multiple: a.multiple } };
    case "NUMERIC":
      return { ...base, payload: { type: "NUMERIC", unit: a.unit, format: a.format } };
    case "FILL_BLANKS":
      return { ...base, payload: { type: "FILL_BLANKS", segments: splitBlanks(a.text) } };
    case "MATCHING":
      return {
        ...base,
        payload: {
          type: "MATCHING",
          left: a.left,
          right: shuffleNotIdentity(
            a.right.map((label, index) => ({ index, label })),
            `${seed}:right`,
          ),
        },
      };
    case "ORDERING":
      return { ...base, payload: { type: "ORDERING", items: shuffleNotIdentity(a.items, `${seed}:order`) } };
    case "TRUE_FALSE":
      return { ...base, payload: { type: "TRUE_FALSE", requireJustification: a.requireJustification } };
    case "SHORT_TEXT":
      return { ...base, payload: { type: "SHORT_TEXT" } };
  }
}
