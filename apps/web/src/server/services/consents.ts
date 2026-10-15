import { collections } from "@devoirs/db";
import { CONSENT_VERSIONS } from "@devoirs/shared";
import { createHash } from "node:crypto";
import { ObjectId } from "mongodb";

// Empreinte de la version des textes légaux (les textes eux-mêmes arrivent au jalon 9).
const legalHash = (type: string, version: string) =>
  createHash("sha256").update(`${type}:${version}`).digest("hex");

export async function recordSignupConsents(userId: string): Promise<void> {
  const now = new Date();
  await collections().consents.insertMany(
    (["TERMS", "PRIVACY"] as const).map((type) => ({
      _id: new ObjectId(),
      userId,
      childId: null,
      type,
      version: CONSENT_VERSIONS[type],
      granted: true,
      textHash: legalHash(type, CONSENT_VERSIONS[type]),
      createdAt: now,
    })),
  );
}
