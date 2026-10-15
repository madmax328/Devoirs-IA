import type { Avatar, ChildLevel, ChildSettings, ConsentType } from "@devoirs/shared";
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
