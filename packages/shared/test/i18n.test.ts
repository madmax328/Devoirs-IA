import { describe, expect, it } from "vitest";
import { createTranslator, translate, translateError } from "../src/i18n";

describe("i18n", () => {
  it("traduit une clé en français", () => {
    expect(translate("fr-FR", "levels.SIXIEME")).toBe("6e");
  });
  it("interpole les paramètres", () => {
    const t = createTranslator("fr-FR");
    expect(t("childSpace.hello", { name: "Léa" })).toBe("Salut Léa !");
  });
  it("retombe sur le français quand une langue n'a pas la clé", () => {
    expect(translate("en-US", "common.save")).toBe("Enregistrer");
  });
  it("traduit les erreurs de validation", () => {
    expect(translateError("fr-FR", "errors.pinFormat")).toMatch(/4 chiffres/);
    expect(translateError("fr-FR", "message libre")).toBe("message libre");
  });
});
