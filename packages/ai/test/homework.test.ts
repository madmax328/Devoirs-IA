import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { describe, expect, it } from "vitest";
import {
  MASK,
  SAFE_FALLBACK_HINT,
  analysisSchema,
  analyzeHomework,
  buildCoachMessages,
  classifyMessage,
  coachReplySchema,
  coachTurn,
  detectDistressKeywords,
  maskPersonalInfo,
  revealsNumericAnswer,
  type CoachContext,
  type CoachReply,
  type LlmClient,
  type StructuredRequest,
  type StructuredResult,
} from "../src";

describe("masquage des informations personnelles", () => {
  it.each([
    ["Je m'appelle Léa Martin", "Je m'appelle " + MASK],
    ["mon mail c'est lea.m@gmail.com", "mon mail c'est " + MASK],
    ["appelle moi au 06 12 34 56 78", "appelle moi au " + MASK],
    ["j'habite 12 rue des Lilas", "j'habite " + MASK],
    ["ajoute moi @lea_du_93 sur insta", "ajoute moi " + MASK + " sur insta"],
    ["je suis au collège Jean Moulin", "je suis au collège " + MASK],
    ["j'habite à 75011 Paris", "j'habite à " + MASK],
  ])("« %s »", (input, expected) => {
    expect(maskPersonalInfo(input).text).toBe(expected);
  });
  it("ne touche pas aux exercices de maths", () => {
    for (const s of ["3 × 4 = 12", "Calcule 1 500 + 250", "x = 7/2", "Le triangle ABC a un côté de 12 cm"]) {
      expect(maskPersonalInfo(s)).toEqual({ text: s, found: [] });
    }
  });
});

describe("signaux de détresse (filet déterministe)", () => {
  it.each([
    "on se moque de moi tous les jours",
    "j'ai envie de mourir",
    "ils me frappent à la récré",
    "je veux en finir",
    "je subis du harcèlement",
  ])("détecte « %s »", (s) => expect(detectDistressKeywords(s)).toBe(true));
  it.each([
    "j'en ai marre de ce devoir",
    "je suis nul en maths",
    "je vais mourir de rire",
    "la guerre de Cent Ans",
  ])("ne détecte pas « %s »", (s) => expect(detectDistressKeywords(s)).toBe(false));
});

describe("fuite de la réponse", () => {
  it("détecte la réponse dans le message du coach, sous toutes ses écritures", () => {
    expect(revealsNumericAnswer("La réponse est 21.", "21")).toBe(true);
    expect(revealsNumericAnswer("Tu trouves 3,5 cm.", "7/2")).toBe(true);
    expect(revealsNumericAnswer("Tu trouves 3.5 cm.", "3,5")).toBe(true);
  });
  it("n'est pas une fuite si l'élève l'a écrite lui-même", () => {
    expect(revealsNumericAnswer("Oui, 21 c'est juste !", "21", "je trouve 21")).toBe(false);
  });
  it("ignore les autres nombres", () => {
    expect(revealsNumericAnswer("Commence par diviser 28 par 4.", "21")).toBe(false);
  });
});

const context: CoachContext = {
  subjectLabel: "Mathématiques",
  levelLabel: "6e",
  exerciseKind: "problème",
  statement: "Calcule les 3/4 de 28.",
  questions: [
    {
      index: 0,
      text: "Calcule les 3/4 de 28.",
      answerKind: "numeric",
      expectedAnswer: "21",
      solutionSteps: "28 ÷ 4 = 7 ; 7 × 3 = 21",
    },
  ],
  notions: [{ id: "ma.6e.fraction-d-une-quantite", title: "Prendre une fraction d'une quantité" }],
};

const baseReply: CoachReply = {
  reply: "Que cherche-t-on ?",
  intent: "question",
  hintLevel: 0,
  currentQuestion: 0,
  childAnswer: "none",
  questionSolved: false,
  allDone: false,
  flags: { distress: false, personalInfo: false, offTopic: false, answerRequested: false },
  recap: null,
};

function fakeLlm(data: unknown, onCall?: (req: StructuredRequest<unknown>) => void): LlmClient {
  return {
    async structured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
      onCall?.(req as StructuredRequest<unknown>);
      if (data instanceof Error) throw data;
      return { data: data as T, stopReason: "end_turn" };
    },
  };
}

describe("coach", () => {
  it("place le contexte confidentiel dans le premier message et alterne les rôles", () => {
    const msgs = buildCoachMessages(context, [
      { role: "child", text: "", action: "start" },
      { role: "coach", text: "Bonjour !" },
      { role: "child", text: "je sais pas", action: "message" },
      { role: "child", text: "", action: "hint" },
    ]);
    expect(msgs.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(msgs[0]!.content).toContain("CONFIDENTIEL");
    expect(msgs[0]!.content).toContain("Réponse attendue : 21");
    expect(msgs[2]!.content).toContain("[L'élève demande un indice.]");
  });

  it("remplace un message qui donnerait la réponse", async () => {
    const llm = fakeLlm({ ...baseReply, reply: "C'est simple : la réponse est 21 !" });
    const res = await coachTurn(llm, context, [
      { role: "child", text: "donne moi la réponse", action: "message" },
    ]);
    expect(res).toMatchObject({ leakBlocked: true, reply: { reply: SAFE_FALLBACK_HINT } });
  });

  it("laisse passer la confirmation d'une réponse trouvée par l'élève", async () => {
    const llm = fakeLlm({
      ...baseReply,
      reply: "Bravo, 21 c'est juste !",
      childAnswer: "correct",
      questionSolved: true,
    });
    const res = await coachTurn(llm, context, [{ role: "child", text: "21", action: "message" }]);
    expect(res!.leakBlocked).toBe(false);
  });
});

describe("classifieur de sécurité", () => {
  it("garde le filet déterministe si le modèle échoue", async () => {
    const res = await classifyMessage(fakeLlm(new Error("indisponible")), "on se moque de moi au collège");
    expect(res.distress).toBe(true);
  });
  it("ajoute la détection par mots-clés à la réponse du modèle", async () => {
    const res = await classifyMessage(
      fakeLlm({
        distress: false,
        category: "none",
        personalInfo: false,
        inappropriate: false,
        offTopic: false,
      }),
      "j'ai envie de mourir",
    );
    expect(res.distress).toBe(true);
  });
});

describe("lecture de l'exercice", () => {
  it("envoie les photos et ne garde que des notions du référentiel", async () => {
    let sent: StructuredRequest<unknown> | null = null;
    const llm = fakeLlm(
      {
        readable: true,
        unreadableReason: null,
        outOfScope: "none",
        subject: "MATHS",
        level: "SIXIEME",
        notionIds: ["ma.6e.fraction-d-une-quantite", "ma.6e.inventee"],
        exerciseKind: "problème",
        statement: "Calcule les 3/4 de 28.",
        questions: [],
        containsPersonalInfo: false,
      },
      (req) => (sent = req),
    );
    const res = await analyzeHomework(llm, {
      images: [{ mediaType: "image/jpeg", base64: "AAAA" }],
      text: null,
      catalogue: "ma.6e.fraction-d-une-quantite : Prendre une fraction d'une quantité",
      knownNotionIds: new Set(["ma.6e.fraction-d-une-quantite"]),
    });
    expect(res!.notionIds).toEqual(["ma.6e.fraction-d-une-quantite"]);
    const content = (sent!.messages![0]!.content as { type: string }[]).map((c) => c.type);
    expect(content).toEqual(["image", "text"]);
    expect(sent!.system).toContain("ma.6e.fraction-d-une-quantite");
  });
});

describe("schémas de sortie structurée", () => {
  it("n'utilisent pas de construction mal prise en charge", () => {
    for (const s of [analysisSchema, coachReplySchema]) {
      const json = JSON.stringify(betaZodOutputFormat(s));
      expect(json).not.toContain("oneOf");
    }
  });
});
