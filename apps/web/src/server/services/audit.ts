import { collections } from "@devoirs/db";
import { ObjectId } from "mongodb";

/** Journal d'audit : actions sensibles, sans données personnelles dans `meta`. */
export async function audit(
  actorId: string | null,
  action: string,
  targetType: string,
  targetId: string | null,
  meta?: Record<string, unknown>,
): Promise<void> {
  await collections().auditLogs.insertOne({
    _id: new ObjectId(),
    actorId,
    action,
    targetType,
    targetId,
    ...(meta ? { meta } : {}),
    createdAt: new Date(),
  });
}
