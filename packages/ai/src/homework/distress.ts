/**
 * Filet de sécurité déterministe pour les signaux de détresse : s'ajoute au classifieur IA
 * (il fonctionne même si l'IA est indisponible). Les faux positifs sont acceptés :
 * la réponse est bienveillante et n'accuse personne.
 */
const PATTERNS: RegExp[] = [
  /\b(me|se) (suicider|tuer|faire du mal)\b/i,
  /\bsuicid/i,
  /\b(envie|plus envie) de (mourir|vivre)\b/i,
  /\bje veux mourir\b/i,
  /\bje (veux|voudrais) (disparaître|disparaitre|en finir)\b/i,
  /\bscarifi/i,
  /\b(on|ils|elles|il|elle) (me frappe(nt)?|me tape(nt)?|me harc[eè]le(nt)?|me menace(nt)?|me racket(te|tent)?)\b/i,
  /\bharc[eè]lement\b/i,
  /\b(on|ils|elles) se moque(nt)? de moi\b/i,
  /\bpersonne ne m'aime\b/i,
  /\bj'ai peur de rentrer\b/i,
  /\bmon (père|beau-père|frère|oncle) me (frappe|touche)\b/i,
];

export function detectDistressKeywords(text: string): boolean {
  const normalized = text.replace(/[’']/g, "'");
  return PATTERNS.some((re) => re.test(normalized));
}
