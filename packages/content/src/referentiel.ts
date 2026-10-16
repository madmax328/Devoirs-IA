import { LEVEL_CODES, SUBJECT_CODES, levelRank, referentielFileSchema, type Notion } from "@devoirs/shared";
import { RAW_REFERENTIEL_FILES } from "./files.generated";

export interface Referentiel {
  notions: Notion[];
  byId: Map<string, Notion>;
  /** Empreinte du contenu : change dès qu'une notion est modifiée (sert à resynchroniser la base). */
  version: string;
}

/** Empreinte FNV-1a (pas de dépendance à node:crypto, utilisable partout). */
export function fingerprint(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function buildReferentiel(rawFiles: unknown[]): Referentiel {
  const notions: Notion[] = [];
  for (const raw of rawFiles) {
    const file = referentielFileSchema.parse(raw);
    for (const n of file.notions) notions.push({ ...n, subject: file.subject, level: file.level });
  }
  const byId = new Map(notions.map((n) => [n.id, n]));
  return { notions, byId, version: `${notions.length}-${fingerprint(JSON.stringify(notions))}` };
}

let cached: Referentiel | null = null;
export function referentiel(): Referentiel {
  return (cached ??= buildReferentiel(RAW_REFERENTIEL_FILES));
}

/** Liste des problèmes du graphe (vide si tout va bien). */
export function validateGraph(ref: Referentiel): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const n of ref.notions) {
    if (seen.has(n.id)) errors.push(`${n.id} : identifiant en double`);
    seen.add(n.id);

    const [subj, lvl] = n.id.split(".") as [keyof typeof SUBJECT_CODES, keyof typeof LEVEL_CODES];
    if (SUBJECT_CODES[subj] !== n.subject)
      errors.push(`${n.id} : préfixe de matière incohérent avec ${n.subject}`);
    if (LEVEL_CODES[lvl] !== n.level) errors.push(`${n.id} : préfixe de niveau incohérent avec ${n.level}`);

    for (const p of n.prerequisites) {
      const pre = ref.byId.get(p);
      if (!pre) errors.push(`${n.id} : prérequis inconnu ${p}`);
      else if (levelRank(pre.level) > levelRank(n.level))
        errors.push(`${n.id} : prérequis ${p} d'un niveau supérieur`);
      if (p === n.id) errors.push(`${n.id} : se cite lui-même comme prérequis`);
    }
  }

  // Détection de cycles (parcours en profondeur).
  const state = new Map<string, "visiting" | "done">();
  const visit = (id: string, path: string[]) => {
    if (state.get(id) === "done") return;
    if (state.get(id) === "visiting") {
      errors.push(`cycle : ${[...path, id].join(" → ")}`);
      return;
    }
    state.set(id, "visiting");
    for (const p of ref.byId.get(id)?.prerequisites ?? []) if (ref.byId.has(p)) visit(p, [...path, id]);
    state.set(id, "done");
  };
  for (const n of ref.notions) visit(n.id, []);
  return errors;
}

/** Tous les prérequis (directs et indirects), du plus proche au plus lointain. */
export function ancestors(ref: Referentiel, id: string): Notion[] {
  const out: Notion[] = [];
  const seen = new Set<string>([id]);
  let frontier = [id];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const cur of frontier) {
      for (const p of ref.byId.get(cur)?.prerequisites ?? []) {
        if (seen.has(p)) continue;
        seen.add(p);
        const n = ref.byId.get(p);
        if (n) out.push(n);
        next.push(p);
      }
    }
    frontier = next;
  }
  return out;
}

/** Notions qui dépendent directement de `id`. */
export function dependents(ref: Referentiel, id: string): Notion[] {
  return ref.notions.filter((n) => n.prerequisites.includes(id));
}
