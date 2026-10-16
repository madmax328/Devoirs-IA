import { SUBJECTS, SCHOOL_LEVELS } from "@devoirs/shared";
import { describe, expect, it } from "vitest";
import { ancestors, buildReferentiel, dependents, referentiel, validateGraph } from "../src";

describe("référentiel", () => {
  const ref = referentiel();

  it("se charge et respecte le schéma", () => {
    expect(ref.notions.length).toBeGreaterThan(150);
  });

  it("a un graphe valide (ids uniques, prérequis existants, pas de cycle, pas de prérequis d'un niveau supérieur)", () => {
    expect(validateGraph(ref)).toEqual([]);
  });

  it("couvre toutes les matières, et maths/français sur tous les niveaux du CM2 à la 3e", () => {
    for (const s of SUBJECTS) expect(ref.notions.some((n) => n.subject === s)).toBe(true);
    for (const subject of ["MATHS", "FRANCAIS"] as const) {
      for (const level of SCHOOL_LEVELS) {
        expect(
          ref.notions.filter((n) => n.subject === subject && n.level === level).length,
        ).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it("remonte les prérequis jusqu'au CM2 (ex. Pythagore → racine des tables)", () => {
    const chain = ancestors(ref, "ma.4e.pythagore").map((n) => n.id);
    expect(chain).toContain("ma.4e.puissances");
    expect(chain.some((id) => id.startsWith("ma.cm2."))).toBe(true);
  });

  it("chaque notion de maths au-delà du CM2 a au moins un prérequis", () => {
    const orphans = ref.notions.filter(
      (n) => n.subject === "MATHS" && n.level !== "CM2" && n.prerequisites.length === 0,
    );
    expect(orphans.map((n) => n.id)).toEqual([]);
  });

  it("trouve les notions qui dépendent d'une notion", () => {
    expect(dependents(ref, "ma.6e.fractions-egales").map((n) => n.id)).toContain("ma.5e.fractions-comparer");
  });

  it("détecte un cycle et un prérequis inconnu", () => {
    const bad = buildReferentiel([
      {
        subject: "MATHS",
        level: "SIXIEME",
        notions: [
          {
            id: "ma.6e.a",
            theme: "Thème",
            title: "Notion A",
            description: "Description assez longue",
            prerequisites: ["ma.6e.b"],
            commonMistakes: ["erreur x"],
            examples: ["exemple"],
          },
          {
            id: "ma.6e.b",
            theme: "Thème",
            title: "Notion B",
            description: "Description assez longue",
            prerequisites: ["ma.6e.a", "ma.6e.zzz"],
            commonMistakes: ["erreur x"],
            examples: ["exemple"],
          },
        ],
      },
    ]);
    const errors = validateGraph(bad);
    expect(errors.some((e) => e.startsWith("cycle"))).toBe(true);
    expect(errors.some((e) => e.includes("prérequis inconnu"))).toBe(true);
  });

  it("change de version quand le contenu change", () => {
    const a = buildReferentiel([
      {
        subject: "MATHS",
        level: "SIXIEME",
        notions: [
          {
            id: "ma.6e.a",
            theme: "Thème",
            title: "Notion A",
            description: "Description assez longue",
            prerequisites: [],
            commonMistakes: ["erreur x"],
            examples: ["exemple"],
          },
        ],
      },
    ]);
    const b = buildReferentiel([
      {
        subject: "MATHS",
        level: "SIXIEME",
        notions: [
          {
            id: "ma.6e.a",
            theme: "Thème",
            title: "Notion A2",
            description: "Description assez longue",
            prerequisites: [],
            commonMistakes: ["erreur x"],
            examples: ["exemple"],
          },
        ],
      },
    ]);
    expect(a.version).not.toBe(b.version);
  });
});
