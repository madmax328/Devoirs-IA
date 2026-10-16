import { collections, ObjectId } from "@devoirs/db";
import { referenceResponse } from "@devoirs/pedagogy";
import type { DiagnosticOverviewItem, DiagnosticStep, StudentResponse } from "@devoirs/shared";
import { describe, expect, it } from "vitest";
import { POST as answerPost } from "@/app/api/child/diagnostic/[id]/answer/route";
import { GET as overviewGet, POST as startPost } from "@/app/api/child/diagnostic/route";
import { DELETE as childDelete } from "@/app/api/children/[id]/route";
import { childWithSession, jsonRequest } from "./helpers";

const noCtx = undefined as never;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function start(headers: Headers, subject = "MATHS"): Promise<DiagnosticStep> {
  const res = await startPost(jsonRequest("/api/child/diagnostic", "POST", headers, { subject }), noCtx);
  expect(res.status).toBe(200);
  return (await res.json()) as DiagnosticStep;
}

async function goodResponse(exerciseId: string): Promise<StudentResponse> {
  const ex = await collections().exercises.findOne({ _id: new ObjectId(exerciseId) });
  return referenceResponse(ex!.answer);
}

async function wrongResponse(exerciseId: string): Promise<StudentResponse> {
  const ex = (await collections().exercises.findOne({ _id: new ObjectId(exerciseId) }))!;
  switch (ex.answer.type) {
    case "NUMERIC":
      return { type: "NUMERIC", value: "123456" };
    case "MCQ":
      return {
        type: "MCQ",
        selected: [
          ex.answer.choices.findIndex((_, i) => !(ex.answer as { correct: number[] }).correct.includes(i)),
        ],
      };
    case "TRUE_FALSE":
      return { type: "TRUE_FALSE", value: !ex.answer.correct };
    case "FILL_BLANKS":
      return { type: "FILL_BLANKS", values: Object.fromEntries(ex.answer.blanks.map((b) => [b.id, "zzz"])) };
    case "ORDERING":
      return { type: "ORDERING", order: [...ex.answer.items].reverse() };
    case "MATCHING":
      return {
        type: "MATCHING",
        pairs: ex.answer.pairs.map(([l], i, all) => [l, all[(i + 1) % all.length]![1]] as [number, number]),
      };
    default:
      throw new Error("type non géré");
  }
}

async function send(headers: Headers, step: DiagnosticStep, body: object): Promise<Response> {
  return answerPost(
    jsonRequest(`/api/child/diagnostic/${step.sessionId}/answer`, "POST", headers, {
      exerciseId: step.exercise!.id,
      ...body,
    }),
    ctx(step.sessionId),
  );
}

describe("diagnostic adaptatif (API)", () => {
  it("démarre avec un exercice qui ne contient pas la réponse", async () => {
    const { childHeaders } = await childWithSession();
    const step = await start(childHeaders);
    expect(step.exercise).not.toBeNull();
    expect(step.progress).toEqual({ asked: 0, max: 12 });
    const json = JSON.stringify(step.exercise);
    for (const secret of ['"correct"', '"accepted"', '"pairs"', '"value"', '"explanation"', '"hints"'])
      expect(json).not.toContain(secret);
  });

  it("reprend le même exercice si l'enfant revient plus tard", async () => {
    const { childHeaders } = await childWithSession();
    const a = await start(childHeaders);
    const b = await start(childHeaders);
    expect(b.sessionId).toBe(a.sessionId);
    expect(b.exercise!.id).toBe(a.exercise!.id);
  });

  it("va jusqu'au bout et fait un bilan positif quand tout est réussi", async () => {
    const { childHeaders, childId } = await childWithSession();
    let step = await start(childHeaders);
    let guard = 0;
    while (step.exercise && guard++ < 20) {
      const res = await send(childHeaders, step, {
        response: await goodResponse(step.exercise.id),
        durationMs: 12000,
      });
      step = (await res.json()) as DiagnosticStep;
      expect(step.feedback).toMatchObject({ kind: "good" });
    }
    expect(step.exercise).toBeNull();
    expect(step.summary!.mastered.length).toBeGreaterThan(0);
    expect(step.summary!.toWork).toEqual([]);
    expect(await collections().masteryStates.countDocuments({ childId, observations: { $gt: 0 } })).toBe(
      step.summary!.mastered.length,
    );
    expect(await collections().answerAttempts.countDocuments({ childId, context: "diagnostic" })).toBe(
      step.progress.asked,
    );

    const ov = (await (
      await overviewGet(jsonRequest("/api/child/diagnostic", "GET", childHeaders), noCtx)
    ).json()) as { items: DiagnosticOverviewItem[] };
    expect(ov.items.find((i) => i.subject === "MATHS")).toMatchObject({ status: "COMPLETED" });
  });

  it("après un échec, teste d'abord les prérequis pour trouver la lacune racine", async () => {
    const { childHeaders } = await childWithSession();
    const { referentiel } = await import("@devoirs/content");
    const byId = referentiel().byId;
    let step = await start(childHeaders);
    const asked: string[] = [];
    let guard = 0;
    while (step.exercise && guard++ < 20) {
      const ex = (await collections().exercises.findOne({ _id: new ObjectId(step.exercise.id) }))!;
      asked.push(ex.notionIds[0]!);
      step = (await (
        await send(childHeaders, step, { response: await wrongResponse(step.exercise.id) })
      ).json()) as DiagnosticStep;
      expect(step.feedback!.kind).toBe("notYet");
    }
    // Au moins une fois, la question suivante porte sur un prérequis de la notion ratée…
    const descents = asked.slice(1).filter((id, i) => byId.get(asked[i]!)!.prerequisites.includes(id));
    expect(descents.length).toBeGreaterThan(0);
    // … et le bilan commence par les bases (une notion d'un niveau inférieur à la 6e).
    expect(step.summary!.mastered).toEqual([]);
    expect(byId.get(step.summary!.toWork[0]!.id)!.level).toBe("CM2");
  });

  it("une saisie illisible ne compte pas : l'enfant peut corriger", async () => {
    const { childHeaders, childId } = await childWithSession();
    let step = await start(childHeaders);
    // On cherche un exercice numérique en passant les autres (« je ne sais pas »).
    let guard = 0;
    while (step.exercise && step.exercise.type !== "NUMERIC" && guard++ < 15) {
      step = (await (await send(childHeaders, step, { skipped: true })).json()) as DiagnosticStep;
      expect(step.feedback!.kind).toBe("skipped");
    }
    expect(step.exercise?.type).toBe("NUMERIC");
    const before = await collections().answerAttempts.countDocuments({ childId });
    const retry = (await (
      await send(childHeaders, step, { response: { type: "NUMERIC", value: "beaucoup" } })
    ).json()) as DiagnosticStep;
    expect(retry.feedback).toEqual({ kind: "retry", messageKey: "exercise.feedback.unreadableNumber" });
    expect(retry.exercise!.id).toBe(step.exercise!.id);
    expect(await collections().answerAttempts.countDocuments({ childId })).toBe(before);
  });

  it("refuse une réponse à un autre exercice que celui affiché, et la session d'un autre enfant", async () => {
    const a = await childWithSession();
    const b = await childWithSession();
    const step = await start(a.childHeaders);
    const wrongId = await answerPost(
      jsonRequest(`/api/child/diagnostic/${step.sessionId}/answer`, "POST", a.childHeaders, {
        exerciseId: new ObjectId().toHexString(),
        skipped: true,
      }),
      ctx(step.sessionId),
    );
    expect(wrongId.status).toBe(409);
    const other = await send(b.childHeaders, step, { skipped: true });
    expect(other.status).toBe(404);
  });

  it("indique quand une matière n'a pas encore d'exercices", async () => {
    const { childHeaders } = await childWithSession({ settings: { subjects: ["SVT"] } });
    const ov = (await (
      await overviewGet(jsonRequest("/api/child/diagnostic", "GET", childHeaders), noCtx)
    ).json()) as { items: DiagnosticOverviewItem[] };
    expect(ov.items).toEqual([
      { subject: "SVT", status: "UNAVAILABLE", sessionId: null, progress: null, summary: null },
    ]);
    const res = await startPost(
      jsonRequest("/api/child/diagnostic", "POST", childHeaders, { subject: "SVT" }),
      noCtx,
    );
    expect(res.status).toBe(409);
  });

  it("la suppression du profil efface aussi le diagnostic, les réponses et la maîtrise", async () => {
    const { childHeaders, parentHeaders, childId } = await childWithSession();
    const step = await start(childHeaders);
    await send(childHeaders, step, { response: await goodResponse(step.exercise!.id) });
    await childDelete(jsonRequest(`/api/children/${childId}`, "DELETE", parentHeaders), ctx(childId));
    const c = collections();
    expect(await c.diagnosticSessions.countDocuments({ childId })).toBe(0);
    expect(await c.answerAttempts.countDocuments({ childId })).toBe(0);
    expect(await c.masteryStates.countDocuments({ childId })).toBe(0);
  });
});
