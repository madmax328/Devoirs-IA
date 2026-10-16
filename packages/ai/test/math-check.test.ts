import { describe, expect, it } from "vitest";
import { checkNumericAnswer, normalizeExpression } from "../src";

describe("vérification des calculs", () => {
  it("lit l'écriture française", () => {
    expect(normalizeExpression("3,5 × 2 − 1 ÷ 4")).toBe("3.5 * 2 - 1 / 4");
  });
  it("confirme une réponse juste, y compris en fraction", () => {
    expect(checkNumericAnswer("28 / 4 * 3", "21", 0).status).toBe("match");
    expect(checkNumericAnswer("1/3 + 1/6", "1/2", 0).status).toBe("match");
    expect(checkNumericAnswer("sqrt(36 + 64)", "10", 0).status).toBe("match");
    expect(checkNumericAnswer("2 × π × 3", "18,85", 0.01).status).toBe("match");
  });
  it("détecte une réponse fausse", () => {
    expect(checkNumericAnswer("18 * 2.5", "40", 0)).toEqual({ status: "mismatch", computed: "45" });
  });
  it("ne valide pas ce qu'il ne peut pas calculer", () => {
    expect(checkNumericAnswer(null, "3", 0).status).toBe("unverifiable");
    expect(checkNumericAnswer("trois plus deux", "5", 0).status).toBe("unverifiable");
  });
});
