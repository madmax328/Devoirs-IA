import {
  detectDistressKeywords,
  type LlmClient,
  type StructuredRequest,
  type StructuredResult,
} from "@devoirs/ai";

/**
 * IA de démonstration (AI_FAKE=1) : réponses scriptées pour tester les écrans et les parcours
 * de bout en bout sans clé API. Jamais utilisée sur Vercel (voir getLlm).
 */
export class DemoLlm implements LlmClient {
  async structured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
    const lastUser = [...(req.messages ?? [])].reverse().find((m) => m.role === "user");
    const raw = typeof lastUser?.content === "string" ? lastUser.content : (req.user ?? "");
    // On ignore le contexte confidentiel (qui contient la solution) : seul compte ce que l'élève a écrit.
    const text = raw.split("[FIN DU CONTEXTE]").pop() ?? raw;
    const ok = (data: unknown): StructuredResult<T> => ({ data: data as T, stopReason: "end_turn" });

    switch (req.feature) {
      case "HOMEWORK_VISION":
        return ok({
          readable: true,
          unreadableReason: null,
          outOfScope: "none",
          subject: "MATHS",
          level: "SIXIEME",
          notionIds: ["ma.6e.fraction-d-une-quantite"],
          exerciseKind: "problème de fractions",
          statement:
            "Dans une classe de 28 élèves, les 3/4 mangent à la cantine. Combien d'élèves mangent à la cantine ?",
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
        });
      case "MODERATION":
        return ok({
          distress: detectDistressKeywords(text),
          category: "none",
          personalInfo: false,
          inappropriate: false,
          offTopic: false,
        });
      case "HOMEWORK_COACH": {
        const base = {
          currentQuestion: 0,
          childAnswer: "none",
          questionSolved: false,
          allDone: false,
          recap: null,
          flags: { distress: false, personalInfo: false, offTopic: false, answerRequested: false },
        };
        if (text.includes("demande un indice"))
          return ok({
            ...base,
            reply:
              "Petit indice : « les 3/4 », ça veut dire qu'on partage en 4 parts égales et qu'on en prend 3. Par quoi peux-tu commencer ?",
            intent: "hint",
            hintLevel: 1,
          });
        if (text.includes("n'y arrive vraiment pas"))
          return ok({
            ...base,
            reply:
              "Pas de panique, on regarde un exemple ensemble ! Pour trouver les 2/5 de 30 : on partage 30 en 5 (ça fait 6), puis on prend 2 parts : 2 × 6 = 12. À toi : combien fait 28 partagé en 4 ?",
            intent: "lesson",
            hintLevel: 3,
          });
        if (/\b21\b/.test(text))
          return ok({
            ...base,
            reply:
              "Bravo ! Tu as partagé 28 en 4 parts (7), puis pris 3 parts : 21 élèves. C'est exactement ça !",
            intent: "recap",
            childAnswer: "correct",
            questionSolved: true,
            allDone: true,
            recap: {
              learned: [
                "Prendre une fraction d'une quantité : diviser par le dénominateur, multiplier par le numérateur",
              ],
              notionsToWork: [],
            },
          });
        if (text.includes("ouvre l'exercice"))
          return ok({
            ...base,
            reply:
              "Salut ! Avant de calculer, dis-moi avec tes mots : qu'est-ce qu'on cherche dans cet exercice ?",
            intent: "question",
            hintLevel: 0,
          });
        return ok({
          ...base,
          reply: "Pas encore tout à fait. Regarde bien : par quel nombre faut-il diviser 28 d'abord ?",
          intent: "feedback",
          hintLevel: 0,
          childAnswer: "incorrect",
        });
      }
      default:
        return { data: null, stopReason: "end_turn" };
    }
  }
}

export const demoAiEnabled = () => process.env.AI_FAKE === "1" && !process.env.VERCEL;
