import type { Db } from "mongodb";
import { getDb } from "./client";
import type { AuditLogDoc, ChildDoc, ChildSessionDoc, ConsentDoc, DeviceDoc } from "./types";

export const COLLECTIONS = {
  children: "children",
  consents: "consents",
  devices: "devices",
  childSessions: "childSessions",
  auditLogs: "auditLogs",
} as const;

export function collections(db: Db = getDb()) {
  ensureIndexesOnce(db);
  return {
    children: db.collection<ChildDoc>(COLLECTIONS.children),
    consents: db.collection<ConsentDoc>(COLLECTIONS.consents),
    devices: db.collection<DeviceDoc>(COLLECTIONS.devices),
    childSessions: db.collection<ChildSessionDoc>(COLLECTIONS.childSessions),
    auditLogs: db.collection<AuditLogDoc>(COLLECTIONS.auditLogs),
  };
}
export type Collections = ReturnType<typeof collections>;

/** Idempotent : à lancer à chaque déploiement (pnpm db:indexes). */
export async function ensureIndexes(db: Db = getDb()): Promise<void> {
  const c = collections(db);
  await Promise.all([
    c.children.createIndex({ parentId: 1, createdAt: 1 }),
    c.consents.createIndex({ userId: 1, type: 1, createdAt: -1 }),
    c.consents.createIndex({ childId: 1 }),
    c.devices.createIndex({ ownerId: 1 }),
    c.childSessions.createIndex({ tokenHash: 1 }, { unique: true }),
    c.childSessions.createIndex({ childId: 1 }),
    // MongoDB supprime lui-même les sessions expirées.
    c.childSessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    c.auditLogs.createIndex({ actorId: 1, createdAt: -1 }),
  ]);
}

const indexed = new WeakSet<Db>();

/**
 * Crée les index au premier accès à la base (une fois par instance serveur), sans bloquer les requêtes.
 * Évite d'avoir besoin de la base pendant le build Vercel.
 */
function ensureIndexesOnce(db: Db): void {
  if (indexed.has(db)) return;
  indexed.add(db);
  ensureIndexes(db).catch((err: unknown) => {
    indexed.delete(db);
    console.error("[db] création des index échouée", err instanceof Error ? err.message : err);
  });
}
