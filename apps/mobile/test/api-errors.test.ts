import { describe, expect, it } from "vitest";
import { toApiError } from "../src/lib/api-errors";

describe("erreurs de l'API", () => {
  it("traduit la clé et interpole les détails", () => {
    const err = toApiError(423, {
      error: { code: "PIN_LOCKED", message: "childSpace.locked", details: { minutes: 5 } },
    });
    expect(err.code).toBe("PIN_LOCKED");
    expect(err.message).toContain("5 min");
  });
  it("donne un message générique si le corps est inattendu", () => {
    expect(toApiError(500, null).message).toMatch(/Oups/);
  });
});
