import { describe, expect, it } from "vitest";
import { isPinComplete, pressPinKey } from "../src/lib/pin";

describe("pavé du code PIN", () => {
  it("ajoute des chiffres jusqu'à 4", () => {
    let v = "";
    for (const k of ["1", "2", "3", "4", "5"] as const) v = pressPinKey(v, k);
    expect(v).toBe("1234");
    expect(isPinComplete(v)).toBe(true);
  });
  it("efface le dernier chiffre", () => {
    expect(pressPinKey("12", "back")).toBe("1");
    expect(pressPinKey("", "back")).toBe("");
  });
});
