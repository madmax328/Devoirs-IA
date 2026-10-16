import type {
  Avatar,
  ChildLevel,
  ChildSettings,
  ConsentType,
  ExerciseContent,
  ExerciseReportInput,
  ExerciseStatus,
  ExerciseType,
  Notion,
  StudentResponse,
  Subject,
} from "@devoirs/shared";
import type { ObjectId } from "mongodb";

/**
 * Collections gérées par Better Auth : "user", "session", "account", "verification".
 * Champ ajouté à "user" : role.
 */
export type UserRole = "PARENT" | "ADMIN";

export interface ChildDoc {
  _id: ObjectId;
  parentId: string;
  displayName: string;
  level: ChildLevel;
  avatar: Avatar;
  pinHash: string;
  pinFailedCount: number;
  pinLockCount: number;
  pinLockedUntil: Date | null;
  settings: ChildSettings;
  xpTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Jamais modifié ni supprimé, sauf suppression complète du compte. */
export interface ConsentDoc {
  _id: ObjectId;
  userId: string;
  childId: string | null;
  type: ConsentType;
  version: string;
  granted: boolean;
  textHash: string;
  createdAt: Date;
}

export interface DeviceDoc {
  _id: ObjectId;
  ownerId: string;
  platform: "ios" | "android" | "web";
  label: string | null;
  dedicatedChildId: string | null;
  pushToken: string | null;
  lastSeenAt: Date;
  createdAt: Date;
}

/** Jeton court de l'espace enfant, obtenu avec le PIN. Seule l'empreinte SHA-256 est stockée. */
export interface ChildSessionDoc {
  _id: ObjectId;
  tokenHash: string;
  childId: string;
  parentId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface AuditLogDoc {
  _id: ObjectId;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

// ───────── Référentiel et exercices (jalon 2)

/** Une notion du référentiel, copiée depuis packages/content (le dépôt fait foi). */
export interface NotionDoc extends Omit<Notion, "id"> {
  _id: string;
  cycle: 3 | 4;
  /** Notion retirée du référentiel : conservée pour l'historique, plus proposée. */
  archived: boolean;
  updatedAt: Date;
}

/** AI = généré par l'IA ; HUMAN = écrit dans l'admin ; REPO = écrit dans le dépôt (packages/content). */
export type ExerciseSource = "AI" | "HUMAN" | "REPO";

export interface ExerciseDoc extends ExerciseContent {
  _id: ObjectId;
  /** Clé stable des exercices du dépôt (null sinon). */
  key: string | null;
  type: ExerciseType;
  status: ExerciseStatus;
  source: ExerciseSource;
  /** Empreinte du contenu, pour repérer les doublons et les modifications. */
  contentHash: string;
  /** Difficulté sur une échelle de type Elo, recalibrée avec les réponses des élèves (jalon 3). */
  rating: number;
  stats: { served: number; correct: number };
  openReports: number;
  genMeta: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExerciseReviewDoc {
  _id: ObjectId;
  exerciseId: ObjectId;
  /** « ai:<modèle> », « repo » ou l'identifiant de l'admin. */
  reviewer: string;
  verdict: ExerciseStatus | "NOTE";
  notes: string | null;
  createdAt: Date;
}

export interface ExerciseReportDoc {
  _id: ObjectId;
  exerciseId: ObjectId;
  reporterType: "CHILD" | "PARENT";
  reporterId: string;
  reason: ExerciseReportInput["reason"];
  comment: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

/** Coût des appels IA : aucune donnée personnelle, aucun identifiant d'enfant. */
export interface AiUsageLogDoc {
  _id: ObjectId;
  feature: string;
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costMicroUsd: number;
  latencyMs: number;
  ok: boolean;
  stopReason: string | null;
  createdAt: Date;
}

/** Petites valeurs techniques (versions synchronisées, réglages modifiables depuis l'admin). */
export interface MetaDoc {
  _id: string;
  value: unknown;
  updatedAt: Date;
}

// ───────── Maîtrise et diagnostic (jalon 3)

/** Maîtrise d'une notion par un enfant (score de type Elo). */
export interface MasteryStateDoc {
  _id: ObjectId;
  childId: string;
  notionId: string;
  rating: number;
  observations: number;
  lastPracticedAt: Date | null;
  /** Prochaine révision (répétition espacée, jalon 5). */
  nextReviewAt: Date | null;
  updatedAt: Date;
}

/** Chaque réponse est conservée : on pourra recalculer la maîtrise avec un autre modèle. */
export interface AnswerAttemptDoc {
  _id: ObjectId;
  childId: string;
  exerciseId: ObjectId;
  notionId: string;
  context: "diagnostic" | "session" | "homework";
  contextId: string;
  response: StudentResponse | null;
  skipped: boolean;
  outcome: string;
  score: number;
  hintsUsed: number;
  durationMs: number | null;
  createdAt: Date;
}

export interface DiagnosticSessionDoc {
  _id: ObjectId;
  childId: string;
  subject: Subject;
  status: "IN_PROGRESS" | "COMPLETED";
  queue: string[];
  results: { notionId: string; outcome: "pass" | "fail" | "skip"; score: number; exerciseId: string }[];
  maxItems: number;
  /** Exercice affiché, en attente de réponse. */
  current: { exerciseId: string; notionId: string; servedAt: Date } | null;
  /** Exercices déjà montrés (pour ne jamais reposer le même). */
  shownExerciseIds: string[];
  startedAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}
