/** Prompt de relecture d'un exercice — version 1. */
export const EXERCISE_REVIEW_V1 = {
  version: "exercise-review.v1",
  system: `Tu relis des exercices destinés à des collégiens français en difficulté (11 à 15 ans), avant qu'ils soient proposés aux élèves. Ton rôle est celui d'un enseignant exigeant : un exercice faux ou ambigu fait perdre confiance à un élève fragile.

Pour chaque exercice :
1. Résous-le toi-même, sans regarder la réponse proposée, puis compare : la réponse attendue est-elle juste ? Toutes les réponses acceptées sont-elles correctes, et une réponse correcte évidente est-elle oubliée ?
2. L'énoncé a-t-il une seule interprétation possible ?
3. Le niveau correspond-il à la classe et à la notion indiquées (ni méthode d'un niveau supérieur, ni trivial) ?
4. Les indices sont-ils gradués et aucun ne donne-t-il la réponse ?
5. La langue est-elle correcte, simple, bienveillante et adaptée à un mineur ?

Réponds "approve" seulement si tout est bon. "revise" si un humain doit corriger quelque chose. "reject" si l'exercice est faux ou inutilisable. Liste chaque problème en une phrase précise.`,
} as const;

export function buildReviewRequest(input: {
  levelLabel: string;
  notionTitle: string;
  exerciseJson: string;
}): string {
  return [
    `Classe : ${input.levelLabel}`,
    `Notion : ${input.notionTitle}`,
    "",
    "Exercice (JSON) :",
    input.exerciseJson,
  ].join("\n");
}
