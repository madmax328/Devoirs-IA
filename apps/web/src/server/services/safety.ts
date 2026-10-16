import { collections, type SafetyEventDoc } from "@devoirs/db";
import { ObjectId } from "mongodb";

/** Enregistre un événement de sécurité (type et date seulement, jamais le contenu). */
export async function recordSafetyEvent(
  childId: string,
  parentId: string,
  type: SafetyEventDoc["type"],
): Promise<void> {
  await collections().safetyEvents.insertOne({
    _id: new ObjectId(),
    childId,
    parentId,
    type,
    source: "homework",
    createdAt: new Date(),
  });
}

/**
 * Prévient le parent qu'un moment difficile a été signalé, sans transmettre le contenu.
 * Une seule notification non lue à la fois par enfant.
 */
export async function notifyParentOfDifficultMoment(parentId: string, childId: string): Promise<void> {
  const c = collections();
  const existing = await c.notifications.findOne({
    userId: parentId,
    childId,
    type: "SAFETY_MOMENT",
    readAt: null,
  });
  if (existing) return;
  await c.notifications.insertOne({
    _id: new ObjectId(),
    userId: parentId,
    type: "SAFETY_MOMENT",
    childId,
    readAt: null,
    createdAt: new Date(),
  });
}

export async function unreadNotifications(parentId: string) {
  return collections()
    .notifications.find({ userId: parentId, readAt: null })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function markNotificationRead(parentId: string, id: string): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  await collections().notifications.updateOne(
    { _id: new ObjectId(id), userId: parentId },
    { $set: { readAt: new Date() } },
  );
}
