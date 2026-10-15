import { collections, type ChildDoc } from "@devoirs/db";
import { CHILD_SESSION_HOURS, type ChildPublic } from "@devoirs/shared";
import { createHash, randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { verifySecret } from "../hashing";
import { HttpError } from "../http";
import { isLocked, minutesLeft, onFailure, onSuccess } from "../pin-lock";
import { getOwnedChild, toChildPublic } from "./children";

export interface ChildSessionContext {
  child: ChildPublic;
  parentId: string;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface ChildLoginResult {
  token: string;
  expiresAt: Date;
  child: ChildPublic;
}

/**
 * Ouvre l'espace enfant : le parent doit être connecté sur l'appareil,
 * l'enfant doit lui appartenir et le PIN doit être bon.
 */
export async function loginChild(
  parentId: string,
  childId: string,
  pin: string,
  now = new Date(),
): Promise<ChildLoginResult> {
  const child = await getOwnedChild(parentId, childId);
  const c = collections();

  if (isLocked(child, now)) {
    throw new HttpError(423, "PIN_LOCKED", "childSpace.locked", { minutes: minutesLeft(child, now) });
  }

  if (!(await verifySecret(child.pinHash, pin))) {
    const next = onFailure(child, now);
    await c.children.updateOne({ _id: child._id }, { $set: next });
    if (isLocked(next, now)) {
      throw new HttpError(423, "PIN_LOCKED", "childSpace.locked", { minutes: minutesLeft(next, now) });
    }
    throw new HttpError(401, "WRONG_PIN", "childSpace.wrongPin");
  }

  await c.children.updateOne({ _id: child._id }, { $set: onSuccess() });
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + CHILD_SESSION_HOURS * 3600_000);
  await c.childSessions.insertOne({
    _id: new ObjectId(),
    tokenHash: hashToken(token),
    childId,
    parentId,
    expiresAt,
    createdAt: now,
  });
  return { token, expiresAt, child: toChildPublic({ ...child, ...onSuccess() } as ChildDoc) };
}

export async function getChildSessionFromToken(
  token: string,
  now = new Date(),
): Promise<ChildSessionContext | null> {
  const c = collections();
  const session = await c.childSessions.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: now } });
  if (!session || !ObjectId.isValid(session.childId)) return null;
  const child = await c.children.findOne({ _id: new ObjectId(session.childId), parentId: session.parentId });
  if (!child) return null;
  return { child: toChildPublic(child), parentId: session.parentId };
}

export async function logoutChild(token: string): Promise<void> {
  await collections().childSessions.deleteOne({ tokenHash: hashToken(token) });
}
