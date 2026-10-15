import { describe, expect, it } from "vitest";
import { createChildSchema, defaultChildSettings, registerSchema } from "../src";

const validChild = {
  displayName: "Léa",
  level: "SIXIEME",
  avatar: "renard",
  pin: "4821",
  parentalConsent: true,
};

describe("createChildSchema", () => {
  it("accepte un profil valide", () => {
    expect(createChildSchema.safeParse(validChild).success).toBe(true);
  });
  it("exige le consentement parental", () => {
    const r = createChildSchema.safeParse({ ...validChild, parentalConsent: false });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("errors.mustConsent");
  });
  it("refuse un PIN qui n'a pas 4 chiffres", () => {
    for (const pin of ["123", "12345", "12a4", ""]) {
      expect(createChildSchema.safeParse({ ...validChild, pin }).success).toBe(false);
    }
  });
  it("refuse un nom avec des chiffres ou un e-mail", () => {
    for (const displayName of ["lea2012", "lea@mail.fr", " "]) {
      expect(createChildSchema.safeParse({ ...validChild, displayName }).success).toBe(false);
    }
  });
  it("accepte les prénoms composés et accentués", () => {
    for (const displayName of ["Jean-Éloïse", "Maël", "N'Golo"]) {
      expect(createChildSchema.safeParse({ ...validChild, displayName }).success).toBe(true);
    }
  });
  it("refuse le CM2 comme classe d'un profil", () => {
    expect(createChildSchema.safeParse({ ...validChild, level: "CM2" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("normalise l'e-mail", () => {
    const r = registerSchema.parse({
      name: "Ana",
      email: " Ana@Mail.FR ",
      password: "motdepasse10",
      acceptTerms: true,
    });
    expect(r.email).toBe("ana@mail.fr");
  });
  it("exige un mot de passe de 10 caractères", () => {
    expect(
      registerSchema.safeParse({ name: "Ana", email: "a@b.fr", password: "court", acceptTerms: true })
        .success,
    ).toBe(false);
  });
});

describe("defaultChildSettings", () => {
  it("couvre maths et français par défaut, 10 minutes, 20h30", () => {
    expect(defaultChildSettings()).toMatchObject({
      subjects: ["MATHS", "FRANCAIS"],
      sessionMinutes: 10,
      curfew: "20:30",
    });
  });
});
