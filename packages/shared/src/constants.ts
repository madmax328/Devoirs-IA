export const SCHOOL_LEVELS = ["CM2", "SIXIEME", "CINQUIEME", "QUATRIEME", "TROISIEME"] as const;
export type SchoolLevel = (typeof SCHOOL_LEVELS)[number];

/** Le CM2 ne sert qu'à la remédiation : un profil enfant est forcément au collège. */
export const CHILD_LEVELS = [
  "SIXIEME",
  "CINQUIEME",
  "QUATRIEME",
  "TROISIEME",
] as const satisfies readonly SchoolLevel[];
export type ChildLevel = (typeof CHILD_LEVELS)[number];

export const SUBJECTS = ["MATHS", "FRANCAIS", "ANGLAIS", "HIST_GEO_EMC", "SVT", "PHYSIQUE_CHIMIE"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const AVATARS = ["renard", "chouette", "loutre", "panda-roux", "tortue", "lynx"] as const;
export type Avatar = (typeof AVATARS)[number];

export const MAX_CHILDREN_PER_PARENT = 3;
export const PIN_LENGTH = 4;

/** Verrouillage progressif du PIN : après N échecs, blocage de X minutes. */
export const PIN_MAX_FAILURES = 5;
export const PIN_LOCK_MINUTES = [1, 5, 15, 60] as const;

export const CHILD_SESSION_HOURS = 12;

export const DEFAULT_SESSION_MINUTES = 10;
export const DEFAULT_CURFEW = "20:30";

/** Versions des textes légaux : toute modification du texte doit incrémenter la version. */
export const CONSENT_VERSIONS = {
  PARENTAL_CHILD_PROFILE: "2026-10-15",
  TERMS: "2026-10-15",
  PRIVACY: "2026-10-15",
} as const;
export type ConsentType = keyof typeof CONSENT_VERSIONS;
