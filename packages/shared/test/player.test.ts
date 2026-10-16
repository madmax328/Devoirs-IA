import { describe, expect, it } from "vitest";
import {
  draftToResponse,
  emptyDraft,
  isDraftComplete,
  setPair,
  toggleChoice,
  toggleOrderItem,
  type PublicExercise,
} from "../src";

const matching: PublicExercise = {
  id: "1",
  type: "MATCHING",
  statement: "Associe",
  payload: {
    type: "MATCHING",
    left: ["a", "b"],
    right: [
      { index: 1, label: "B" },
      { index: 0, label: "A" },
    ],
  },
};

describe("saisie des réponses", () => {
  it("QCM simple : une seule case cochée à la fois", () => {
    let d = { type: "MCQ" as const, selected: [] as number[] };
    d = toggleChoice(d, 1, false) as typeof d;
    d = toggleChoice(d, 2, false) as typeof d;
    expect(d.selected).toEqual([2]);
  });
  it("QCM multiple : coche et décoche", () => {
    let d = { type: "MCQ" as const, selected: [] as number[] };
    d = toggleChoice(d, 2, true) as typeof d;
    d = toggleChoice(d, 0, true) as typeof d;
    d = toggleChoice(d, 2, true) as typeof d;
    expect(d.selected).toEqual([0]);
  });
  it("appariement : un élément de droite ne peut servir qu'une fois", () => {
    let d = emptyDraft(matching) as Extract<ReturnType<typeof emptyDraft>, { type: "MATCHING" }>;
    expect(isDraftComplete(matching, d)).toBe(false);
    d = setPair(d, 0, 1) as typeof d;
    d = setPair(d, 1, 1) as typeof d; // reprend le même élément de droite
    expect(d.pairs).toEqual({ 1: 1 });
    d = setPair(d, 0, 0) as typeof d;
    expect(isDraftComplete(matching, d)).toBe(true);
    expect(draftToResponse(d)).toEqual({
      type: "MATCHING",
      pairs: [
        [0, 0],
        [1, 1],
      ],
    });
  });
  it("ordre : touche dans l'ordre, retouche pour retirer", () => {
    let d = { type: "ORDERING" as const, order: [] as string[] };
    d = toggleOrderItem(d, "b") as typeof d;
    d = toggleOrderItem(d, "a") as typeof d;
    d = toggleOrderItem(d, "b") as typeof d;
    expect(d.order).toEqual(["a"]);
  });
  it("texte à trous : complet seulement quand toutes les cases sont remplies", () => {
    const ex: PublicExercise = {
      id: "2",
      type: "FILL_BLANKS",
      statement: "s",
      payload: { type: "FILL_BLANKS", segments: [{ text: "Il " }, { blankId: "1" }, { blankId: "2" }] },
    };
    expect(isDraftComplete(ex, { type: "FILL_BLANKS", values: { "1": "x" } })).toBe(false);
    expect(isDraftComplete(ex, { type: "FILL_BLANKS", values: { "1": "x", "2": " y" } })).toBe(true);
  });
});
