import type {
  CoachReply,
  HomeworkAnalysis,
  LlmClient,
  SafetyClassification,
  StructuredRequest,
  StructuredResult,
} from "@devoirs/ai";
import { collections, ObjectId } from "@devoirs/db";
import type { HomeworkView } from "@devoirs/shared";
import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as abandonPost } from "@/app/api/child/homework/[id]/abandon/route";
import { POST as confirmPost } from "@/app/api/child/homework/[id]/confirm/route";
import { POST as messagesPost } from "@/app/api/child/homework/[id]/messages/route";
import { GET as photoGet } from "@/app/api/child/homework/[id]/photos/[index]/route";
import { GET as homeworkGet } from "@/app/api/child/homework/[id]/route";
import { GET as listGet, POST as createPost } from "@/app/api/child/homework/route";
import { setLlmForTests } from "@/server/services/ai";
import { childWithSession, jsonRequest } from "./helpers";

const noCtx = undefined as never;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

const analysis: HomeworkAnalysis = {
  readable: true,
  unreadableReason: null,
  outOfScope: "none",
  subject: "MATHS",
  level: "SIXIEME",
  notionIds: ["ma.6e.fraction-d-une-quantite"],
  exerciseKind: "problème",
  statement: "Dans une classe de 28 élèves, les 3/4 mangent à la cantine. Combien ?",
  questions: [
    {
      index: 0,
      text: "Combien d'élèves mangent à la cantine ?",
      answerKind: "numeric",
      expectedAnswer: "21",
      solutionSteps: "28 ÷ 4 = 7 ; 7 × 3 = 21",
    },
  ],
  containsPersonalInfo: false,
};

const reply = (over: Partial<CoachReply> = {}): CoachReply => ({
  reply: "Qu'est-ce qu'on cherche ?",
  intent: "question",
  hintLevel: 0,
  currentQuestion: 0,
  childAnswer: "none",
  questionSolved: false,
  allDone: false,
  flags: { distress: false, personalInfo: false, offTopic: false, answerRequested: false },
  recap: null,
  ...over,
});

/** Faux modèle : lecture, coach (réponses en file), classifieur selon le texte. */
class FakeLlm implements LlmClient {
  analysis: HomeworkAnalysis = analysis;
  coachQueue: CoachReply[] = [];
  calls: StructuredRequest<unknown>[] = [];
  async structured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
    this.calls.push(req as StructuredRequest<unknown>);
    if (req.feature === "HOMEWORK_VISION") return { data: this.analysis as T, stopReason: "end_turn" };
    if (req.feature === "MODERATION") {
      const text = req.user ?? "";
      const c: SafetyClassification = {
        distress: /frappe|insult/.test(text),
        category: "none",
        personalInfo: false,
        inappropriate: /contenu interdit/.test(text),
        offTopic: false,
      };
      return { data: c as T, stopReason: "end_turn" };
    }
    return { data: (this.coachQueue.shift() ?? reply()) as T, stopReason: "end_turn" };
  }
}

let llm: FakeLlm;
beforeEach(() => {
  llm = new FakeLlm();
  setLlmForTests(llm);
});
afterEach(() => {
  setLlmForTests(null);
  delete process.env.LIMIT_HOMEWORK_PER_DAY;
});

const photo = () => ({ mediaType: "image/jpeg" as const, base64: randomBytes(600).toString("base64") });

async function create(headers: Headers, body: object): Promise<HomeworkView> {
  const res = await createPost(jsonRequest("/api/child/homework", "POST", headers, body), noCtx);
  expect(res.status).toBe(201);
  return (await res.json()) as HomeworkView;
}
async function confirm(
  headers: Headers,
  id: string,
  correctedStatement: string | null = null,
): Promise<HomeworkView> {
  const res = await confirmPost(
    jsonRequest(`/api/child/homework/${id}/confirm`, "POST", headers, { correctedStatement }),
    ctx(id),
  );
  expect(res.status).toBe(200);
  return (await res.json()) as HomeworkView;
}
async function say(headers: Headers, id: string, body: object): Promise<Response> {
  return messagesPost(jsonRequest(`/api/child/homework/${id}/messages`, "POST", headers, body), ctx(id));
}

describe("mode Devoirs", () => {
  it("lit la photo, ne renvoie jamais les solutions, et chiffre la photo (supprimée sous 30 jours)", async () => {
    const { childHeaders, childId } = await childWithSession();
    const p = photo();
    const hw = await create(childHeaders, { photos: [p] });
    expect(hw.status).toBe("TO_CONFIRM");
    expect(hw.analysis).toMatchObject({
      subject: "MATHS",
      questionCount: 1,
      notions: [{ id: "ma.6e.fraction-d-une-quantite" }],
    });
    const json = JSON.stringify(hw);
    expect(json).not.toContain("expectedAnswer");
    expect(json).not.toContain("solutionSteps");
    expect(json).not.toContain("21");

    const stored = await collections().homeworkPhotos.findOne({ childId });
    expect(Buffer.from(stored!.data.buffer).equals(Buffer.from(p.base64, "base64"))).toBe(false);
    const days = (stored!.purgeAt.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThan(31);

    const img = await photoGet(jsonRequest(`/api/child/homework/${hw.id}/photos/0`, "GET", childHeaders), {
      params: Promise.resolve({ id: hw.id, index: "0" }),
    });
    expect(Buffer.from(await img.arrayBuffer()).equals(Buffer.from(p.base64, "base64"))).toBe(true);
  });

  it("réutilise l'analyse d'une photo déjà lue (cache)", async () => {
    const { childHeaders } = await childWithSession();
    const p = photo();
    await create(childHeaders, { photos: [p] });
    await create(childHeaders, { photos: [p] });
    expect(llm.calls.filter((c) => c.feature === "HOMEWORK_VISION")).toHaveLength(1);
  });

  it("signale une photo illisible", async () => {
    const { childHeaders } = await childWithSession();
    llm.analysis = { ...analysis, readable: false, unreadableReason: "La photo est floue." };
    const hw = await create(childHeaders, { photos: [photo()] });
    expect(hw.status).toBe("UNREADABLE");
    expect(hw.analysis!.unreadableReason).toBe("La photo est floue.");
  });

  it("après confirmation, le coach ouvre la discussion (le message technique de départ n'est pas affiché)", async () => {
    const { childHeaders } = await childWithSession();
    const hw = await create(childHeaders, { text: "Calcule les 3/4 de 28." });
    llm.coachQueue.push(reply({ reply: "Salut ! Que te demande-t-on ?" }));
    const started = await confirm(childHeaders, hw.id);
    expect(started.status).toBe("IN_PROGRESS");
    expect(started.messages).toEqual([
      expect.objectContaining({ role: "coach", text: "Salut ! Que te demande-t-on ?" }),
    ]);
    // Le contexte confidentiel (avec la solution) est bien envoyé au coach, pas à l'enfant.
    const coachCall = llm.calls.find((c) => c.feature === "HOMEWORK_COACH")!;
    expect(JSON.stringify(coachCall.messages)).toContain("Réponse attendue : 21");
  });

  it("masque les informations personnelles avant l'IA et avant l'enregistrement", async () => {
    const { childHeaders, childId } = await childWithSession();
    const hw = await create(childHeaders, { text: "Calcule les 3/4 de 28." });
    await confirm(childHeaders, hw.id);
    const res = await say(childHeaders, hw.id, {
      action: "message",
      text: "je m'appelle Léa Martin, mon mail lea@gmail.com, je trouve pas",
    });
    const view = (await res.json()) as HomeworkView;
    const childMsg = view.messages.find((m) => m.role === "child")!;
    expect(childMsg.text).not.toContain("Martin");
    expect(childMsg.text).not.toContain("lea@gmail.com");
    const coachCalls = llm.calls.filter((c) => c.feature === "HOMEWORK_COACH");
    expect(JSON.stringify(coachCalls.at(-1)!.messages)).not.toContain("lea@gmail.com");
    expect(await collections().safetyEvents.findOne({ childId, type: "PERSONAL_INFO" })).not.toBeNull();
  });

  it("remplace un message du coach qui donnerait la réponse", async () => {
    const { childHeaders, childId } = await childWithSession();
    const hw = await create(childHeaders, { text: "Calcule les 3/4 de 28." });
    await confirm(childHeaders, hw.id);
    llm.coachQueue.push(reply({ reply: "Bon d'accord : la réponse est 21." }));
    const view = (await (
      await say(childHeaders, hw.id, { action: "message", text: "donne la réponse" })
    ).json()) as HomeworkView;
    expect(view.messages.at(-1)!.text).not.toContain("21");
    expect(await collections().safetyEvents.findOne({ childId, type: "ANSWER_LEAK_BLOCKED" })).not.toBeNull();
  });

  it("détresse : arrêt de l'exercice, message d'aide (3018, 119), parent prévenu sans le contenu", async () => {
    const { childHeaders, childId } = await childWithSession();
    const hw = await create(childHeaders, { text: "Calcule les 3/4 de 28." });
    await confirm(childHeaders, hw.id);
    const view = (await (
      await say(childHeaders, hw.id, { action: "message", text: "au collège ils me frappent tous les jours" })
    ).json()) as HomeworkView;
    expect(view.status).toBe("SAFETY_STOP");
    const last = view.messages.at(-1)!;
    expect(last.safety).toBe("distress");
    expect(last.text).toContain("3018");
    expect(last.text).toContain("119");

    const event = await collections().safetyEvents.findOne({ childId, type: "DISTRESS" });
    expect(Object.keys(event!).sort()).toEqual(["_id", "childId", "createdAt", "parentId", "source", "type"]);
    const notif = await collections().notifications.findOne({ childId, type: "SAFETY_MOMENT" });
    expect(notif).toMatchObject({ readAt: null });
    expect(JSON.stringify(notif)).not.toContain("frappent");

    // L'exercice ne reprend pas automatiquement.
    expect((await say(childHeaders, hw.id, { action: "message", text: "ok" })).status).toBe(409);
  });

  it("le coach peut aussi déclencher la procédure de détresse", async () => {
    const { childHeaders } = await childWithSession();
    const hw = await create(childHeaders, { text: "Calcule les 3/4 de 28." });
    await confirm(childHeaders, hw.id);
    llm.coachQueue.push(
      reply({ flags: { distress: true, personalInfo: false, offTopic: false, answerRequested: false } }),
    );
    const view = (await (
      await say(childHeaders, hw.id, { action: "message", text: "je suis trop triste en ce moment" })
    ).json()) as HomeworkView;
    expect(view.status).toBe("SAFETY_STOP");
  });

  it("fin de l'exercice : récapitulatif, maîtrise mise à jour (poids réduit) et notions à revoir programmées", async () => {
    const { childHeaders, childId } = await childWithSession();
    const hw = await create(childHeaders, { text: "Calcule les 3/4 de 28." });
    await confirm(childHeaders, hw.id);
    await say(childHeaders, hw.id, { action: "hint", text: "" });
    llm.coachQueue.push(
      reply({
        reply: "Bravo, tu as trouvé !",
        intent: "recap",
        childAnswer: "correct",
        questionSolved: true,
        allDone: true,
        recap: {
          learned: ["Prendre les 3/4 d'un nombre"],
          notionsToWork: ["ma.6e.fractions-egales", "inventee"],
        },
      }),
    );
    const view = (await (
      await say(childHeaders, hw.id, { action: "message", text: "je trouve 21" })
    ).json()) as HomeworkView;
    expect(view.status).toBe("COMPLETED");
    expect(view.hintsUsed).toBe(1);
    expect(view.recap).toEqual({
      learned: ["Prendre les 3/4 d'un nombre"],
      notionsToWork: [{ id: "ma.6e.fractions-egales", title: expect.any(String) }],
    });
    const m = await collections().masteryStates.findOne({
      childId,
      notionId: "ma.6e.fraction-d-une-quantite",
    });
    expect(m!.rating).toBeGreaterThan(0);
    expect(m!.rating).toBeLessThan(80); // un devoir aidé compte moins qu'un exercice fait seul
  });

  it("isole les enfants : un autre enfant ne voit pas l'exercice", async () => {
    const a = await childWithSession();
    const b = await childWithSession();
    const hw = await create(a.childHeaders, { text: "Calcule les 3/4 de 28." });
    expect(
      (await homeworkGet(jsonRequest(`/api/child/homework/${hw.id}`, "GET", b.childHeaders), ctx(hw.id)))
        .status,
    ).toBe(404);
    expect(
      (
        await abandonPost(
          jsonRequest(`/api/child/homework/${hw.id}/abandon`, "POST", b.childHeaders),
          ctx(hw.id),
        )
      ).status,
    ).toBe(404);
    const list = (await (
      await listGet(jsonRequest("/api/child/homework", "GET", b.childHeaders), noCtx)
    ).json()) as { items: unknown[] };
    expect(list.items).toHaveLength(0);
  });

  it("applique la limite quotidienne", async () => {
    process.env.LIMIT_HOMEWORK_PER_DAY = "1";
    const { childHeaders } = await childWithSession();
    await create(childHeaders, { text: "Exercice un" });
    const res = await createPost(
      jsonRequest("/api/child/homework", "POST", childHeaders, { text: "Exercice deux" }),
      noCtx,
    );
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: { code: "DAILY_LIMIT" } });
  });

  it("le coach indisponible (pas de clé IA) renvoie un message adapté à l'enfant", async () => {
    setLlmForTests(null);
    const { childHeaders } = await childWithSession();
    const res = await createPost(
      jsonRequest("/api/child/homework", "POST", childHeaders, { text: "Exercice" }),
      noCtx,
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      error: { code: "COACH_UNAVAILABLE", message: "homework.coachUnavailable" },
    });
  });

  it("refuse une demande vide", async () => {
    const { childHeaders } = await childWithSession();
    const res = await createPost(
      jsonRequest("/api/child/homework", "POST", childHeaders, { photos: [], text: "" }),
      noCtx,
    );
    expect(res.status).toBe(400);
  });

  it("la suppression du profil supprime devoirs, messages et photos", async () => {
    const { childHeaders, parentHeaders, childId } = await childWithSession();
    await create(childHeaders, { photos: [photo()] });
    const { DELETE } = await import("@/app/api/children/[id]/route");
    await DELETE(jsonRequest(`/api/children/${childId}`, "DELETE", parentHeaders), ctx(childId));
    const c = collections();
    expect(await c.homeworkHelps.countDocuments({ childId })).toBe(0);
    expect(await c.homeworkPhotos.countDocuments({ childId })).toBe(0);
    expect(ObjectId.isValid(childId)).toBe(true);
  });
});
