import type { Notion } from "@devoirs/shared";
import { describe, expect, it } from "vitest";
import {
  initialQueue,
  nextNotion,
  outcomeFromScore,
  recordResult,
  summarize,
  type DiagnosticContext,
  type DiagnosticState,
} from "../src";

const n = (id: string, level: Notion["level"], prerequisites: string[] = [], theme = "Nombres"): Notion => ({
  id,
  subject: "MATHS",
  level,
  theme,
  title: `Notion ${id}`,
  description: "Une description suffisamment longue.",
  prerequisites,
  commonMistakes: ["erreur"],
  examples: ["exemple"],
});

// Petit graphe : 5e.fractions-addition ← 6e.fractions-egales ← cm2.fractions-sens
const notions = [
  n("ma.cm2.fractions-sens", "CM2"),
  n("ma.cm2.tables", "CM2"),
  n("ma.6e.fractions-egales", "SIXIEME", ["ma.cm2.fractions-sens", "ma.cm2.tables"]),
  n("ma.6e.priorites", "SIXIEME", ["ma.cm2.tables"]),
  n("ma.5e.fractions-addition", "CINQUIEME", ["ma.6e.fractions-egales"]),
  n("ma.5e.relatifs", "CINQUIEME", [], "Relatifs"),
  n("ma.5e.sans-exercice", "CINQUIEME", ["ma.6e.priorites"]),
];
const ctx: DiagnosticContext = {
  byId: new Map(notions.map((x) => [x.id, x])),
  testable: new Set(notions.map((x) => x.id).filter((id) => id !== "ma.5e.sans-exercice")),
};

function run(answers: Record<string, boolean>, start: string[]): DiagnosticState {
  let state: DiagnosticState = { queue: start, results: [], maxItems: 12 };
  for (let id = nextNotion(state, ctx); id; id = nextNotion(state, ctx)) {
    const ok = answers[id] ?? true;
    state = recordResult(state, { notionId: id, outcome: ok ? "pass" : "fail", score: ok ? 1 : 0 }, ctx);
  }
  return state;
}

describe("diagnostic adaptatif", () => {
  it("part des notions du niveau de l'élève qui ont des exercices (les plus fondatrices d'abord)", () => {
    const q = initialQueue(notions, "MATHS", "CINQUIEME", ctx.testable);
    expect(q.slice(0, 2)).toEqual(["ma.5e.fractions-addition", "ma.5e.relatifs"]);
    expect(q).not.toContain("ma.5e.sans-exercice");
  });

  it("complète avec le niveau inférieur quand le niveau de l'élève a peu d'exercices", () => {
    const q = initialQueue(notions, "MATHS", "CINQUIEME", new Set(["ma.5e.relatifs", "ma.6e.priorites"]));
    expect(q).toContain("ma.6e.priorites");
  });

  it("tout réussi : on ne descend pas dans les prérequis", () => {
    const s = run({}, ["ma.5e.fractions-addition", "ma.5e.relatifs"]);
    expect(s.results.map((r) => r.notionId)).toEqual(["ma.5e.fractions-addition", "ma.5e.relatifs"]);
    expect(summarize(s, ctx)).toEqual({
      mastered: ["ma.5e.fractions-addition", "ma.5e.relatifs"],
      toWork: [],
    });
  });

  it("un échec fait tester les prérequis en priorité, jusqu'à la lacune racine", () => {
    const s = run(
      { "ma.5e.fractions-addition": false, "ma.6e.fractions-egales": false, "ma.cm2.fractions-sens": false },
      ["ma.5e.fractions-addition", "ma.5e.relatifs"],
    );
    expect(s.results.map((r) => r.notionId)).toEqual([
      "ma.5e.fractions-addition",
      "ma.6e.fractions-egales",
      "ma.cm2.fractions-sens",
      "ma.cm2.tables",
      "ma.5e.relatifs",
    ]);
    const { toWork, mastered } = summarize(s, ctx);
    // La base à travailler en premier : le sens des fractions (CM2).
    expect(toWork[0]).toBe("ma.cm2.fractions-sens");
    expect(mastered).toEqual(["ma.cm2.tables", "ma.5e.relatifs"]);
  });

  it("s'arrête au nombre maximal de questions", () => {
    const state: DiagnosticState = {
      queue: ["ma.5e.fractions-addition", "ma.5e.relatifs"],
      results: [],
      maxItems: 1,
    };
    const s1 = recordResult(state, { notionId: "ma.5e.fractions-addition", outcome: "pass", score: 1 }, ctx);
    expect(nextNotion(s1, ctx)).toBeNull();
  });

  it("ne repose jamais une notion déjà testée", () => {
    const s = run({ "ma.6e.fractions-egales": false, "ma.6e.priorites": false }, [
      "ma.6e.fractions-egales",
      "ma.6e.priorites",
    ]);
    const ids = s.results.map((r) => r.notionId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("une réponse est réussie à partir de 75 %", () => {
    expect(outcomeFromScore(1)).toBe("pass");
    expect(outcomeFromScore(0.75)).toBe("pass");
    expect(outcomeFromScore(0.5)).toBe("fail");
  });
});
