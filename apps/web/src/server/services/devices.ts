import { collections, type DeviceDoc } from "@devoirs/db";
import type { RegisterDeviceInput } from "@devoirs/shared";
import { ObjectId } from "mongodb";
import { getOwnedChild } from "./children";

export async function registerDevice(ownerId: string, input: RegisterDeviceInput): Promise<{ id: string }> {
  if (input.dedicatedChildId) await getOwnedChild(ownerId, input.dedicatedChildId);
  const now = new Date();
  const doc: DeviceDoc = {
    _id: new ObjectId(),
    ownerId,
    platform: input.platform,
    label: input.label ?? null,
    dedicatedChildId: input.dedicatedChildId ?? null,
    pushToken: null,
    lastSeenAt: now,
    createdAt: now,
  };
  await collections().devices.insertOne(doc);
  return { id: doc._id.toHexString() };
}
