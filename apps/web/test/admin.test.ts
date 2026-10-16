import type { AiReview, LlmClient, StructuredRequest, StructuredResult } from "@devoirs/ai";
import { referentiel, seedExercises } from "@devoirs/content";
import { collections } from "@devoirs/db";
import { afterEach, describe, expect, it } from "vitest";
import { POST as generatePost } from "@/app/api/admin/generate/route";
import { PATCH as exercisePatch } from "@/app/api/admin/exercises/[id]/route";
import { POST as reviewPost } from "@/app/api/admin/exercises/[id]/review/route";
import { POST as childSessionPost } from "@/app/api/child-session/route";
import { POST as childrenPost } from "@/app/api/children/route";
import { POST as reportPost } from "@/app/api/exercises/[id]/report/route";
import { setLlmForTests } from "@/server/services/ai";
import { ensureContentSynced } from "@/server/services/content-sync";
import { jsonRequest, signUpParent, validChild } from "./helpers";

const noCtx = undefined as never;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const ADMIN_EMAIL = "admin-tests@exemple.fr";
process.env.ADMIN_EMAILS = `autre@exemple.fr, ${ADMIN_EMAIL.toUpperCase()}`;

let adminHeaders: Headers | null = null;
async function admin(): Promise<Headers> {
  adminHeaders ??= (await signUpParent("Admin", ADMIN_EMAIL)).headers;
  return adminHeaders;
}

async function someSeedExerciseId(key: string): Promise<string> {
  await ensureContentSynced();
  const doc = await collections().exercises.findOne({ key });
  return doc!._id.toHexString();
}

afterEach(() => {
  setLlmForTests(null);
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.AI_DAILY_BUDGET_USD;
});

describe("synchronisation du contenu", () => {
  it("copie le référentiel et les exercices du dépôt, sans doublon au second passage", async () => {
    await ensureContentSynced();
    const c = collections();
    expect(await c.notions.countDocuments({ archived: false })).toBe(referentiel().notions.length);
    expect(await c.exercises.countDocuments({ source: "REPO" })).toBe(seedExercises().length);
    const second = await ensureContentSynced();
    expect(second).toEqual({ notionsSynced: null, seedExercisesChanged: null });
    expect(await c.exercises.countDocuments({ source: "REPO" })).toBe(seedExercises().length);
  });
});

describe("accès à l'administration", () => {
  it("refuse un parent ordinaire (403) et accepte un e-mail de ADMIN_EMAILS (insensible à la casse)", async () => {
    const id = await someSeedExerciseId("ma-6e-priorites-1");
    const parent = await signUpParent();
    const denied = await reviewPost(
      jsonRequest(`/api/admin/exercises/${id}/review`, "POST", parent.headers, {
        verdict: "HUMAN_VALIDATED",
      }),
      ctx(id),
    );
    expect(denied.status).toBe(403);
    const ok = await reviewPost(
      jsonRequest(`/api/admin/exercises/${id}/review`, "POST", await admin(), { verdict: "HUMAN_VALIDATED" }),
      ctx(id),
    );
    expect(ok.status).toBe(200);
  });
});

describe("validation humaine et signalements", () => {
  it("un signalement renvoie un exercice auto-validé en relecture ; la validation clôt le signalement", async () => {
    const id = await someSeedExerciseId("ma-5e-relatifs-1");
    const parent = await signUpParent();
    const r = await reportPost(
      jsonRequest(`/api/exercises/${id}/report`, "POST", parent.headers, {
        reason: "WRONG_ANSWER",
        comment: "Je crois que c'est 3",
      }),
      ctx(id),
    );
    expect(r.status).toBe(201);
    let doc = await collections().exercises.findOne({ key: "ma-5e-relatifs-1" });
    expect(doc).toMatchObject({ status: "DRAFT", openReports: 1 });

    await reviewPost(
      jsonRequest(`/api/admin/exercises/${id}/review`, "POST", await admin(), {
        verdict: "HUMAN_VALIDATED",
        notes: "Vérifié",
      }),
      ctx(id),
    );
    doc = await collections().exercises.findOne({ key: "ma-5e-relatifs-1" });
    expect(doc).toMatchObject({ status: "HUMAN_VALIDATED", openReports: 0 });
    expect(
      await collections().exerciseReports.countDocuments({ exerciseId: doc!._id, resolvedAt: null }),
    ).toBe(0);
  });

  it("un enfant connecté peut signaler un exercice", async () => {
    const id = await someSeedExerciseId("fr-cm2-homophones-1");
    const { headers } = await signUpParent();
    const created = await childrenPost(jsonRequest("/api/children", "POST", headers, validChild), noCtx);
    const { child } = (await created.json()) as { child: { id: string } };
    const login = await childSessionPost(
      jsonRequest("/api/child-session", "POST", headers, { childId: child.id, pin: "4821" }),
      noCtx,
    );
    const { token } = (await login.json()) as { token: string };
    const res = await reportPost(
      jsonRequest(`/api/exercises/${id}/report`, "POST", new Headers({ "x-child-session": token }), {
        reason: "UNCLEAR",
      }),
      ctx(id),
    );
    expect(res.status).toBe(201);
    expect(await collections().exerciseReports.findOne({ reporterId: child.id })).toMatchObject({
      reporterType: "CHILD",
    });
  });

  it("refuse un signalement anonyme", async () => {
    const id = await someSeedExerciseId("fr-cm2-homophones-1");
    const res = await reportPost(
      jsonRequest(`/api/exercises/${id}/report`, "POST", new Headers(), { reason: "TYPO" }),
      ctx(id),
    );
    expect(res.status).toBe(401);
  });

  it("la correction du contenu par l'admin est revérifiée (un indice qui donne la réponse est refusé)", async () => {
    const id = await someSeedExerciseId("ma-6e-priorites-1");
    const doc = (await collections().exercises.findOne({ key: "ma-6e-priorites-1" }))!;
    const content = {
      notionIds: doc.notionIds,
      level: doc.level,
      difficulty: doc.difficulty,
      statement: doc.statement,
      answer: doc.answer,
      explanation: doc.explanation,
      hints: doc.hints,
    };
    const bad = await exercisePatch(
      jsonRequest(`/api/admin/exercises/${id}`, "PATCH", await admin(), {
        content: { ...content, hints: ["a b c", "d e f", "C'est 17."] },
      }),
      ctx(id),
    );
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ error: { code: "EXERCISE_INVALID" } });

    const ok = await exercisePatch(
      jsonRequest(`/api/admin/exercises/${id}`, "PATCH", await admin(), {
        content: { ...content, statement: "Calcule : 5 + 3 × 4 (attention aux priorités)" },
      }),
      ctx(id),
    );
    expect(ok.status).toBe(200);
    expect(await collections().exercises.findOne({ key: "ma-6e-priorites-1" })).toMatchObject({
      status: "HUMAN_VALIDATED",
      statement: "Calcule : 5 + 3 × 4 (attention aux priorités)",
    });
  });
});

describe("génération d'exercices", () => {
  const approve: AiReview = {
    verdict: "approve",
    answerCorrect: true,
    unambiguous: true,
    levelAppropriate: true,
    hintsOk: true,
    issues: [],
  };
  const fake: LlmClient = {
    async structured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
      if (req.feature === "EXERCISE_REVIEW") return { data: approve as T, stopReason: "end_turn" };
      return {
        data: {
          exercises: [
            {
              statement: "Un gâteau de 24 parts : combien de parts font les 2/3 du gâteau ?",
              difficulty: 2,
              answer: { type: "NUMERIC", value: "16", tolerance: 0, unit: null, format: "integer" },
              explanation: "24 ÷ 3 = 8, puis 8 × 2.",
              hints: [
                "Trouve d'abord un tiers.",
                "Divise par 3 puis multiplie par 2.",
                "Exemple : 3/4 de 20 → 5 × 3 = 15.",
              ],
              verificationExpression: "24 / 3 * 2",
            },
          ],
        } as T,
        stopReason: "end_turn",
      };
    },
  };

  it("refuse clairement si la clé IA n'est pas configurée", async () => {
    const res = await generatePost(
      jsonRequest("/api/admin/generate", "POST", await admin(), {
        notionId: "ma.6e.fraction-d-une-quantite",
        count: 1,
      }),
      noCtx,
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: { code: "AI_NOT_CONFIGURED" } });
  });

  it("refuse quand le budget IA du jour est atteint", async () => {
    process.env.ANTHROPIC_API_KEY = "test";
    process.env.AI_DAILY_BUDGET_USD = "0.000001";
    const { ObjectId } = await import("mongodb");
    await collections().aiUsage.insertOne({
      _id: new ObjectId(),
      feature: "EXERCISE_GEN",
      model: "claude-opus-5-5",
      promptVersion: "t",
      inputTokens: 1,
      outputTokens: 1,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      costMicroUsd: 10,
      latencyMs: 1,
      ok: true,
      stopReason: "end_turn",
      createdAt: new Date(),
    });
    const res = await generatePost(
      jsonRequest("/api/admin/generate", "POST", await admin(), {
        notionId: "ma.6e.fraction-d-une-quantite",
        count: 1,
      }),
      noCtx,
    );
    expect(res.status).toBe(429);
  });

  it("enregistre les exercices générés et vérifiés, avec la relecture IA, sans doublon", async () => {
    setLlmForTests(fake);
    const call = () =>
      generatePost(
        jsonRequest("/api/admin/generate", "POST", admin_, {
          notionId: "ma.6e.fraction-d-une-quantite",
          count: 1,
        }),
        noCtx,
      );
    const admin_ = await admin();
    const res = await call();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { created: { id: string; status: string }[] };
    expect(body.created).toHaveLength(1);
    expect(body.created[0]!.status).toBe("AUTO_VALIDATED");
    const doc = await collections().exercises.findOne({ source: "AI" });
    expect(doc).toMatchObject({
      notionIds: ["ma.6e.fraction-d-une-quantite"],
      level: "SIXIEME",
      type: "NUMERIC",
    });
    expect(await collections().exerciseReviews.countDocuments({ exerciseId: doc!._id })).toBe(1);

    const again = (await (await call()).json()) as { created: unknown[] };
    expect(again.created).toHaveLength(0); // même contenu : pas de doublon
  });

  it("refuse une notion inconnue", async () => {
    setLlmForTests(fake);
    const res = await generatePost(
      jsonRequest("/api/admin/generate", "POST", await admin(), { notionId: "ma.6e.n-existe-pas", count: 1 }),
      noCtx,
    );
    expect(res.status).toBe(404);
  });
});
