import type { Notion, SchoolLevel, Subject } from "@devoirs/shared";
import { levelRank } from "@devoirs/shared";

/**
 * Diagnostic adaptatif.
 * On part des notions les plus « fondatrices » du niveau de l'élève. À chaque notion non réussie,
 * on teste ses prérequis (souvent d'un niveau inférieur) en priorité, pour remonter jusqu'à la
 * lacune « racine ». Une notion réussie n'entraîne pas de nouvelle question.
 */

export interface DiagnosticResult {
  notionId: string;
  /** pass = réussi, fail = pas encore, skip = « je ne sais pas » (compté comme pas encore). */
  outcome: "pass" | "fail" | "skip";
  score: number;
}

export interface DiagnosticState {
  queue: string[];
  results: DiagnosticResult[];
  maxItems: number;
}

export interface DiagnosticContext {
  byId: Map<string, Notion>;
  /** Notions pour lesquelles on dispose d'au moins un exercice utilisable. */
  testable: Set<string>;
}

export const DEFAULT_MAX_ITEMS = 12;
export const START_NOTIONS = 6;

/** Notions de départ : celles du niveau de l'élève dont dépendent le plus d'autres notions. */
export function initialQueue(
  notions: Notion[],
  subject: Subject,
  level: SchoolLevel,
  testable: Set<string>,
  max = START_NOTIONS,
): string[] {
  const dependentsCount = new Map<string, number>();
  for (const n of notions)
    for (const p of n.prerequisites) dependentsCount.set(p, (dependentsCount.get(p) ?? 0) + 1);

  const pick = (lvl: SchoolLevel) =>
    notions
      .filter((n) => n.subject === subject && n.level === lvl && testable.has(n.id))
      .sort(
        (a, b) =>
          (dependentsCount.get(b.id) ?? 0) - (dependentsCount.get(a.id) ?? 0) || a.id.localeCompare(b.id),
      );

  let candidates = pick(level);
  // Peu d'exercices au niveau de l'élève (début de banque) : on complète avec le niveau inférieur.
  if (candidates.length < 3) {
    const below = notions.find((n) => levelRank(n.level) === levelRank(level) - 1)?.level;
    if (below) candidates = [...candidates, ...pick(below)];
  }
  // Varier les thèmes : un par thème d'abord, puis le reste.
  const seenThemes = new Set<string>();
  const first: Notion[] = [];
  const rest: Notion[] = [];
  for (const n of candidates) {
    (seenThemes.has(n.theme) ? rest : first).push(n);
    seenThemes.add(n.theme);
  }
  return [...first, ...rest].slice(0, max).map((n) => n.id);
}

const tested = (s: DiagnosticState) => new Set(s.results.map((r) => r.notionId));

/** Prochaine notion à tester, ou null si le diagnostic est terminé. */
export function nextNotion(state: DiagnosticState, ctx: DiagnosticContext): string | null {
  if (state.results.length >= state.maxItems) return null;
  const done = tested(state);
  return state.queue.find((id) => !done.has(id) && ctx.testable.has(id)) ?? null;
}

/** Enregistre un résultat ; en cas d'échec, les prérequis non testés passent en tête de file. */
export function recordResult(
  state: DiagnosticState,
  result: DiagnosticResult,
  ctx: DiagnosticContext,
): DiagnosticState {
  const results = [...state.results, result];
  let queue = state.queue.filter((id) => id !== result.notionId);
  if (result.outcome !== "pass") {
    const done = new Set(results.map((r) => r.notionId));
    const prereqs = (ctx.byId.get(result.notionId)?.prerequisites ?? []).filter(
      (p) => !done.has(p) && ctx.testable.has(p) && !queue.includes(p),
    );
    queue = [...prereqs, ...queue];
  }
  return { ...state, queue, results };
}

/**
 * Bilan : les notions réussies, et les notions à travailler en commençant par les bases
 * (une lacune « racine » est une notion non réussie dont aucun prérequis testé n'a échoué).
 */
export function summarize(
  state: DiagnosticState,
  ctx: DiagnosticContext,
): { mastered: string[]; toWork: string[] } {
  const failed = new Set(state.results.filter((r) => r.outcome !== "pass").map((r) => r.notionId));
  const mastered = state.results.filter((r) => r.outcome === "pass").map((r) => r.notionId);
  const isRoot = (id: string) => !(ctx.byId.get(id)?.prerequisites ?? []).some((p) => failed.has(p));
  const rank = (id: string) => levelRank(ctx.byId.get(id)?.level ?? "TROISIEME");
  const toWork = [...failed].sort((a, b) => Number(isRoot(b)) - Number(isRoot(a)) || rank(a) - rank(b));
  return { mastered, toWork };
}

/** Résultat d'une réponse corrigée → issue du diagnostic. */
export function outcomeFromScore(score: number): DiagnosticResult["outcome"] {
  return score >= 0.75 ? "pass" : "fail";
}
