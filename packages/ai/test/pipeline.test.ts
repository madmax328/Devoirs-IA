import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { referentiel } from "@devoirs/content";
import { describe, expect, it, vi } from "vitest";
import {
  AnthropicLlm,
  aiGenerationSchema,
  generateExercises,
  type AiGeneratedExercise,
  type AiReview,
  type AiUsageEvent,
  type LlmClient,
  type StructuredRequest,
  type StructuredResult,
} from "../src";

const ref = referentiel();
const notion = ref.byId.get("ma.6e.fraction-d-une-quantite")!;

const goodHints = [
  "Commence par trouver un quart.",
  "Divise puis multiplie.",
  "Exemple : 2/5 de 30 → 6 × 2.",
];
const numeric = (value: string, expr: string | null, hints = goodHints): AiGeneratedExercise => ({
  statement: `Calcule les 3/4 de 28. (${value})`,
  difficulty: 2,
  answer: { type: "NUMERIC", value, tolerance: 0, unit: null, format: "any" },
  explanation: "28 ÷ 4 = 7 puis 7 × 3.",
  hints,
  verificationExpression: expr,
});
const approve: AiReview = {
  verdict: "approve",
  answerCorrect: true,
  unambiguous: true,
  levelAppropriate: true,
  hintsOk: true,
  issues: [],
};

/** Faux modèle : renvoie la génération prévue, puis une relecture par exercice. */
class FakeLlm implements LlmClient {
  calls: StructuredRequest<unknown>[] = [];
  constructor(
    private generation: AiGeneratedExercise[] | null,
    private review: (statement: string) => AiReview,
  ) {}
  async structured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
    this.calls.push(req as StructuredRequest<unknown>);
    if (req.feature === "EXERCISE_GEN") {
      return this.generation
        ? { data: { exercises: this.generation } as T, stopReason: "end_turn" }
        : { data: null, stopReason: "refusal" };
    }
    const statement = (
      JSON.parse((req.user ?? "").split("Exercice (JSON) :\n")[1] ?? "{}") as { statement: string }
    ).statement;
    return { data: this.review(statement) as T, stopReason: "end_turn" };
  }
}

describe("pipeline de génération", () => {
  it("valide automatiquement un exercice juste, vérifié par le calcul et approuvé", async () => {
    const llm = new FakeLlm([numeric("21", "28 / 4 * 3")], () => approve);
    const res = await generateExercises(llm, { notion, ref, count: 1 });
    expect(res.accepted).toHaveLength(1);
    expect(res.accepted[0]).toMatchObject({ status: "AUTO_VALIDATED", meta: { mathCheck: "match" } });
    expect(res.accepted[0]!.content).toMatchObject({ notionIds: [notion.id], level: "SIXIEME" });
  });

  it("écarte une réponse contredite par le calcul", async () => {
    const llm = new FakeLlm([numeric("20", "28 / 4 * 3")], () => approve);
    const res = await generateExercises(llm, { notion, ref, count: 1 });
    expect(res.accepted).toHaveLength(0);
    expect(res.discarded[0]!.reasons[0]).toMatch(/le calcul donne 21/);
  });

  it("écarte un exercice dont un indice donne la réponse", async () => {
    const llm = new FakeLlm(
      [numeric("21", "28 / 4 * 3", ["Pense au quart.", "Divise puis multiplie.", "Le résultat est 21."])],
      () => approve,
    );
    const res = await generateExercises(llm, { notion, ref, count: 1 });
    expect(res.discarded[0]!.reasons).toContain("un indice contient la réponse");
  });

  it("envoie en relecture humaine une réponse numérique non vérifiable par le calcul", async () => {
    const llm = new FakeLlm([numeric("21", null)], () => approve);
    const res = await generateExercises(llm, { notion, ref, count: 1 });
    expect(res.accepted[0]).toMatchObject({ status: "DRAFT", meta: { mathCheck: "unverifiable" } });
  });

  it("envoie en relecture humaine ce que la relecture IA veut corriger, et écarte ce qu'elle rejette", async () => {
    const mcq: AiGeneratedExercise = {
      statement: "Quelle fraction de 28 vaut 21 ?",
      difficulty: 3,
      answer: { type: "MCQ", choices: ["1/2", "3/4", "2/3"], correct: [1], multiple: false },
      explanation: "21 = 28 × 3/4.",
      hints: goodHints,
      verificationExpression: null,
    };
    const llm = new FakeLlm([mcq, numeric("21", "28 / 4 * 3")], (statement) =>
      statement.startsWith("Quelle")
        ? { ...approve, verdict: "revise", issues: ["Énoncé ambigu"] }
        : { ...approve, verdict: "reject", answerCorrect: false },
    );
    const res = await generateExercises(llm, { notion, ref, count: 2 });
    expect(res.accepted).toHaveLength(1);
    expect(res.accepted[0]).toMatchObject({
      status: "DRAFT",
      meta: { review: { issues: ["Énoncé ambigu"] } },
    });
    expect(res.discarded[0]!.reasons[0]).toBe("refusé à la relecture");
  });

  it("signale l'échec de la génération (refus du modèle)", async () => {
    const res = await generateExercises(new FakeLlm(null, () => approve), { notion, ref, count: 1 });
    expect(res.generationFailed).toBe(true);
  });

  it("transmet la notion, ses erreurs fréquentes et les énoncés à éviter", async () => {
    const llm = new FakeLlm([numeric("21", "28 / 4 * 3")], () => approve);
    await generateExercises(llm, { notion, ref, count: 1, avoidStatements: ["Ancien énoncé"] });
    const user = llm.calls[0]!.user ?? "";
    expect(user).toContain(notion.title);
    expect(user).toContain(notion.commonMistakes[0]!);
    expect(user).toContain("Ancien énoncé");
    expect(user).toContain("Classe : 6e");
  });
});

describe("format de sortie structurée", () => {
  it("n'utilise pas de construction JSON Schema mal prise en charge (oneOf, prefixItems)", () => {
    const schema = JSON.stringify(betaZodOutputFormat(aiGenerationSchema));
    expect(schema).not.toContain("oneOf");
    expect(schema).not.toContain("prefixItems");
  });
});

describe("client Anthropic", () => {
  const fakeMessage = {
    stop_reason: "end_turn",
    parsed_output: { ok: true },
    usage: {
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 2000,
      cache_creation_input_tokens: 0,
    },
  };

  it("journalise les jetons et le coût sans contenu, et active la relance serveur sur Opus", async () => {
    const parse = vi.fn().mockResolvedValue(fakeMessage);
    const events: AiUsageEvent[] = [];
    const llm = new AnthropicLlm((e) => void events.push(e), {
      beta: { messages: { parse } },
    } as unknown as Anthropic);
    const { z } = await import("zod");
    const res = await llm.structured({
      feature: "EXERCISE_GEN",
      model: "claude-opus-5-5",
      promptVersion: "test.v1",
      system: "sys",
      user: "secret de l'élève",
      schema: z.object({ ok: z.boolean() }),
      effort: "low",
    });
    expect(res.data).toEqual({ ok: true });
    expect(parse.mock.calls[0]![0]).toMatchObject({
      fallbacks: "default",
      betas: ["server-side-fallback-2026-07-01"],
    });
    // 1000 × 4 $ + 2000 × 0,4 $ + 500 × 20 $ par million de jetons = 0,0148 $
    expect(events[0]).toMatchObject({
      feature: "EXERCISE_GEN",
      inputTokens: 1000,
      costMicroUsd: 14800,
      ok: true,
    });
    expect(JSON.stringify(events[0])).not.toContain("secret");
  });

  it("n'envoie pas de relance serveur sur Haiku et gère un refus", async () => {
    const parse = vi.fn().mockResolvedValue({ ...fakeMessage, stop_reason: "refusal", parsed_output: null });
    const llm = new AnthropicLlm(() => undefined, { beta: { messages: { parse } } } as unknown as Anthropic);
    const { z } = await import("zod");
    const res = await llm.structured({
      feature: "CLASSIFY",
      model: "claude-haiku-5-5",
      promptVersion: "t",
      system: "s",
      user: "u",
      schema: z.object({}),
      effort: "low",
    });
    expect(res).toEqual({ data: null, stopReason: "refusal" });
    expect(parse.mock.calls[0]![0]).not.toHaveProperty("fallbacks");
  });
});
