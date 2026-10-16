/** Prompt de génération d'exercices — version 1. Toute modification = nouvelle version (fichier v2). */
export const EXERCISE_GENERATION_V1 = {
  version: "exercise-generation.v1",
  system: `Tu écris des exercices d'entraînement pour une application française destinée à des collégiens (11 à 15 ans) qui ont des difficultés scolaires. Les exercices sont relus par un enseignant, puis proposés aux élèves dans des sessions courtes de 10 minutes.

Ce qui compte :
- Chaque exercice travaille UNE notion précise du programme officiel français (cycle 3 ou 4), au niveau de classe indiqué. Reste dans ce que l'élève a vu en classe : pas de méthode d'un niveau supérieur.
- L'énoncé est court, clair et sans ambiguïté : une seule bonne réponse possible (ou un ensemble précis de bonnes réponses pour un QCM à réponses multiples). Vocabulaire simple, tutoiement, contextes de la vie quotidienne d'un adolescent, sans marques ni personnes réelles, sans stéréotypes.
- Écriture française des nombres : virgule décimale (3,5), espace pour les milliers (1 000), signes ×, ÷, − dans les énoncés.
- Les 3 indices sont gradués : 1) une piste générale (sur quoi porter son attention), 2) la méthode à appliquer, 3) un exemple similaire résolu avec d'AUTRES nombres ou un AUTRE texte. Aucun indice ne contient la réponse de l'exercice, ni un calcul qui la donne directement.
- L'explication (2 à 3 phrases) montre le raisonnement, sur un ton encourageant.
- Pour un élève en difficulté, la difficulté 1-2 correspond à une application directe, 3 à une petite étape de réflexion, 4-5 à un problème en plusieurs étapes.

Format des réponses selon le type :
- NUMERIC : "value" est la valeur exacte attendue, écrite avec une virgule ou en fraction ("3,5", "7/2", "-4"). "format" vaut "fraction_simplified" si l'élève doit donner une fraction irréductible, "integer" si un entier est attendu, "decimal" si une écriture décimale est exigée, sinon "any". "tolerance" vaut 0 sauf pour une valeur approchée. "unit" est l'unité attendue ou null. Fournis "verificationExpression" : le calcul qui donne la réponse, écrit avec des nombres (par exemple "28 / 4 * 3"), pour qu'un programme puisse vérifier ta réponse.
- MCQ : 3 ou 4 choix plausibles (les erreurs fréquentes font de bons distracteurs), "correct" contient les indices (à partir de 0) des bonnes réponses.
- FILL_BLANKS : "text" contient les trous notés [[1]], [[2]]… ; chaque trou liste les réponses acceptées ; "accentSensitive" vaut true si les accents font partie de ce qui est évalué (orthographe), false sinon.
- MATCHING : "pairs" relie l'indice d'un élément de gauche à l'indice d'un élément de droite (la colonne de droite sera mélangée à l'affichage).
- ORDERING : "items" est la liste dans le BON ordre (elle sera mélangée à l'affichage).
- TRUE_FALSE : "requireJustification" vaut true si l'élève doit expliquer ; "expectedJustification" décrit ce qu'on attend.
- SHORT_TEXT : réponse rédigée courte (une ou deux phrases), avec une réponse modèle et 1 à 3 critères de réussite.
Pour les types autres que NUMERIC, "verificationExpression" vaut null.`,
} as const;

export function buildGenerationRequest(input: {
  notion: {
    id: string;
    title: string;
    description: string;
    levelLabel: string;
    subjectLabel: string;
    commonMistakes: string[];
    examples: string[];
  };
  prerequisites: string[];
  count: number;
  types: string[];
  difficulties: number[];
  avoidStatements: string[];
}): string {
  const lines = [
    `Matière : ${input.notion.subjectLabel}`,
    `Classe : ${input.notion.levelLabel}`,
    `Notion : ${input.notion.title} (${input.notion.id})`,
    `Description : ${input.notion.description}`,
    `Erreurs fréquentes des élèves : ${input.notion.commonMistakes.join(" ; ")}`,
    `Exemples : ${input.notion.examples.join(" ; ")}`,
  ];
  if (input.prerequisites.length > 0)
    lines.push(`Prérequis déjà maîtrisés : ${input.prerequisites.join(" ; ")}`);
  lines.push(
    "",
    `Écris ${input.count} exercice(s) différents sur cette notion.`,
    `Types à utiliser (dans cet ordre) : ${input.types.join(", ")}.`,
    `Difficultés visées (dans cet ordre) : ${input.difficulties.join(", ")}.`,
  );
  if (input.avoidStatements.length > 0) {
    lines.push(
      "",
      "Ces exercices existent déjà, n'écris pas les mêmes :",
      ...input.avoidStatements.map((s) => `- ${s}`),
    );
  }
  return lines.join("\n");
}
