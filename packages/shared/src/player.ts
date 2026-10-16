import type { StudentResponse } from "./exercise";
import type { PublicExercise } from "./public-exercise";

/** Réponse en cours de saisie, une forme par type d'exercice (partagé web + mobile). */
export type Draft =
  | { type: "MCQ"; selected: number[] }
  | { type: "NUMERIC"; value: string }
  | { type: "FILL_BLANKS"; values: Record<string, string> }
  | { type: "MATCHING"; pairs: Record<number, number> }
  | { type: "ORDERING"; order: string[] }
  | { type: "TRUE_FALSE"; value: boolean | null }
  | { type: "SHORT_TEXT"; text: string };

export function emptyDraft(ex: PublicExercise): Draft {
  switch (ex.payload.type) {
    case "MCQ":
      return { type: "MCQ", selected: [] };
    case "NUMERIC":
      return { type: "NUMERIC", value: "" };
    case "FILL_BLANKS":
      return { type: "FILL_BLANKS", values: {} };
    case "MATCHING":
      return { type: "MATCHING", pairs: {} };
    case "ORDERING":
      return { type: "ORDERING", order: [] };
    case "TRUE_FALSE":
      return { type: "TRUE_FALSE", value: null };
    case "SHORT_TEXT":
      return { type: "SHORT_TEXT", text: "" };
  }
}

/** QCM : coche/décoche (une seule réponse si l'exercice n'en accepte qu'une). */
export function toggleChoice(
  draft: Extract<Draft, { type: "MCQ" }>,
  index: number,
  multiple: boolean,
): Draft {
  if (!multiple) return { ...draft, selected: [index] };
  const has = draft.selected.includes(index);
  return {
    ...draft,
    selected: has
      ? draft.selected.filter((i) => i !== index)
      : [...draft.selected, index].sort((a, b) => a - b),
  };
}

/** Appariement : associe un élément de gauche à un élément de droite (un élément de droite ne sert qu'une fois). */
export function setPair(
  draft: Extract<Draft, { type: "MATCHING" }>,
  left: number,
  rightIndex: number,
): Draft {
  const pairs: Record<number, number> = {};
  for (const [l, r] of Object.entries(draft.pairs))
    if (r !== rightIndex && Number(l) !== left) pairs[Number(l)] = r;
  pairs[left] = rightIndex;
  return { ...draft, pairs };
}

/** Ordre : ajoute l'élément touché à la suite (ou le retire s'il y est déjà). */
export function toggleOrderItem(draft: Extract<Draft, { type: "ORDERING" }>, item: string): Draft {
  return draft.order.includes(item)
    ? { ...draft, order: draft.order.filter((i) => i !== item) }
    : { ...draft, order: [...draft.order, item] };
}

export function isDraftComplete(ex: PublicExercise, draft: Draft): boolean {
  const p = ex.payload;
  switch (draft.type) {
    case "MCQ":
      return draft.selected.length > 0;
    case "NUMERIC":
      return draft.value.trim().length > 0;
    case "FILL_BLANKS":
      return (
        p.type === "FILL_BLANKS" &&
        p.segments.every((s) => !("blankId" in s) || (draft.values[s.blankId] ?? "").trim().length > 0)
      );
    case "MATCHING":
      return p.type === "MATCHING" && Object.keys(draft.pairs).length === p.left.length;
    case "ORDERING":
      return p.type === "ORDERING" && draft.order.length === p.items.length;
    case "TRUE_FALSE":
      return draft.value !== null;
    case "SHORT_TEXT":
      return draft.text.trim().length > 0;
  }
}

export function draftToResponse(draft: Draft): StudentResponse {
  switch (draft.type) {
    case "MCQ":
      return { type: "MCQ", selected: draft.selected };
    case "NUMERIC":
      return { type: "NUMERIC", value: draft.value };
    case "FILL_BLANKS":
      return { type: "FILL_BLANKS", values: draft.values };
    case "MATCHING":
      return {
        type: "MATCHING",
        pairs: Object.entries(draft.pairs).map(([l, r]) => [Number(l), r] as [number, number]),
      };
    case "ORDERING":
      return { type: "ORDERING", order: draft.order };
    case "TRUE_FALSE":
      return { type: "TRUE_FALSE", value: draft.value ?? false };
    case "SHORT_TEXT":
      return { type: "SHORT_TEXT", text: draft.text };
  }
}
