import { collections, type ChildDoc } from "@devoirs/db";
import {
  CONSENT_VERSIONS,
  MAX_CHILDREN_PER_PARENT,
  childSettingsSchema,
  defaultChildSettings,
  type ChildPublic,
  type CreateChildInput,
  type UpdateChildInput,
} from "@devoirs/shared";
import { fr } from "@devoirs/shared/i18n";
import { createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import { hashSecret } from "../hashing";
import { HttpError, errors } from "../http";
import { audit } from "./audit";

export function toChildPublic(doc: ChildDoc): ChildPublic {
  return {
    id: doc._id.toHexString(),
    displayName: doc.displayName,
    level: doc.level,
    avatar: doc.avatar,
    settings: doc.settings,
    createdAt: doc.createdAt.toISOString(),
  };
}

/** Empreinte du texte de consentement réellement affiché, pour la preuve. */
export const CONSENT_TEXT_HASH = createHash("sha256").update(fr.child.consentText).digest("hex");

function parseId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw errors.notFound();
  return new ObjectId(id);
}

export async function listChildren(parentId: string): Promise<ChildPublic[]> {
  const docs = await collections().children.find({ parentId }).sort({ createdAt: 1 }).toArray();
  return docs.map(toChildPublic);
}

/** Retourne le document seulement s'il appartient bien au parent. */
export async function getOwnedChild(parentId: string, childId: string): Promise<ChildDoc> {
  const doc = await collections().children.findOne({ _id: parseId(childId), parentId });
  if (!doc) throw errors.notFound();
  return doc;
}

export async function createChild(parentId: string, input: CreateChildInput): Promise<ChildPublic> {
  const c = collections();
  // TODO(jalon 8) : en gratuit, la limite sera réduite selon l'abonnement.
  const count = await c.children.countDocuments({ parentId });
  if (count >= MAX_CHILDREN_PER_PARENT) {
    throw new HttpError(409, "MAX_CHILDREN", "parent.maxChildren", { max: MAX_CHILDREN_PER_PARENT });
  }

  const now = new Date();
  const doc: ChildDoc = {
    _id: new ObjectId(),
    parentId,
    displayName: input.displayName,
    level: input.level,
    avatar: input.avatar,
    pinHash: await hashSecret(input.pin),
    pinFailedCount: 0,
    pinLockCount: 0,
    pinLockedUntil: null,
    settings: childSettingsSchema.parse(defaultChildSettings(input.settings ?? {})),
    xpTotal: 0,
    createdAt: now,
    updatedAt: now,
  };
  await c.children.insertOne(doc);
  await c.consents.insertOne({
    _id: new ObjectId(),
    userId: parentId,
    childId: doc._id.toHexString(),
    type: "PARENTAL_CHILD_PROFILE",
    version: CONSENT_VERSIONS.PARENTAL_CHILD_PROFILE,
    granted: true,
    textHash: CONSENT_TEXT_HASH,
    createdAt: now,
  });
  await audit(parentId, "child.create", "child", doc._id.toHexString());
  return toChildPublic(doc);
}

export async function updateChild(
  parentId: string,
  childId: string,
  input: UpdateChildInput,
): Promise<ChildPublic> {
  const current = await getOwnedChild(parentId, childId);
  const set: Partial<ChildDoc> = { updatedAt: new Date() };
  if (input.displayName !== undefined) set.displayName = input.displayName;
  if (input.level !== undefined) set.level = input.level;
  if (input.avatar !== undefined) set.avatar = input.avatar;
  if (input.settings !== undefined)
    set.settings = childSettingsSchema.parse({ ...current.settings, ...input.settings });
  if (input.pin !== undefined) {
    set.pinHash = await hashSecret(input.pin);
    set.pinFailedCount = 0;
    set.pinLockCount = 0;
    set.pinLockedUntil = null;
  }
  const updated = await collections().children.findOneAndUpdate(
    { _id: current._id, parentId },
    { $set: set },
    { returnDocument: "after" },
  );
  if (!updated) throw errors.notFound();
  if (input.pin !== undefined) {
    // Nouveau PIN : on déconnecte les sessions enfant existantes.
    await collections().childSessions.deleteMany({ childId });
  }
  await audit(parentId, "child.update", "child", childId, { fields: Object.keys(input) });
  return toChildPublic(updated);
}

/** Suppression complète du profil et de tout ce qui s'y rattache. */
export async function deleteChild(parentId: string, childId: string): Promise<void> {
  const doc = await getOwnedChild(parentId, childId);
  const c = collections();
  await c.childSessions.deleteMany({ childId });
  await c.consents.deleteMany({ childId });
  await c.devices.updateMany({ dedicatedChildId: childId }, { $set: { dedicatedChildId: null } });
  await c.children.deleteOne({ _id: doc._id });
  await audit(parentId, "child.delete", "child", childId);
}
