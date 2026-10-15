/**
 * Données de démo (environnement local / staging uniquement).
 * Usage : pnpm --filter @devoirs/web seed
 * La progression réaliste (maîtrise, sessions, XP) sera ajoutée aux jalons 3 à 6.
 */
import { closeMongo, collections, ensureIndexes, getDb } from "@devoirs/db";
import { auth } from "@/server/auth";
import { createChild } from "@/server/services/children";

const DEMO_EMAIL = "demo@devoirs-ia.fr";
const DEMO_PASSWORD = "demo-devoirs-ia";
const ADMIN_EMAIL = "admin@devoirs-ia.fr";
const ADMIN_PASSWORD = "admin-devoirs-ia";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "1") {
  throw new Error("Seed refusé en production (définir ALLOW_SEED=1 pour un staging).");
}

async function upsertUser(name: string, email: string, password: string): Promise<string> {
  const db = getDb();
  const existing = await db.collection("user").findOne({ email });
  if (existing) return existing._id.toHexString();
  const res = await auth().api.signUpEmail({ body: { name, email, password, acceptTerms: true } as never });
  return res.user.id;
}

await ensureIndexes();

const parentId = await upsertUser("Camille", DEMO_EMAIL, DEMO_PASSWORD);
const c = collections();
if ((await c.children.countDocuments({ parentId })) === 0) {
  await createChild(parentId, {
    displayName: "Léa",
    level: "SIXIEME",
    avatar: "renard",
    pin: "1234",
    parentalConsent: true,
  });
  await createChild(parentId, {
    displayName: "Tom",
    level: "QUATRIEME",
    avatar: "chouette",
    pin: "5678",
    parentalConsent: true,
    settings: { subjects: ["MATHS", "FRANCAIS", "ANGLAIS"], dysFont: true },
  });
}

const adminId = await upsertUser("Admin", ADMIN_EMAIL, ADMIN_PASSWORD);
const { ObjectId } = await import("@devoirs/db");
await getDb()
  .collection("user")
  .updateOne({ _id: new ObjectId(adminId) }, { $set: { role: "ADMIN" } });

console.log(`Démo prête :
  Parent : ${DEMO_EMAIL} / ${DEMO_PASSWORD}  (Léa 6e, PIN 1234 · Tom 4e, PIN 5678)
  Admin  : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
await closeMongo();
