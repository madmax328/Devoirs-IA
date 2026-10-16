import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { env } from "./env";

/**
 * Clé de chiffrement des photos : PHOTO_ENCRYPTION_KEY (32 octets en base64) si définie,
 * sinon dérivée de BETTER_AUTH_SECRET (HKDF, usage dédié). Changer la clé rend les photos
 * existantes illisibles : sans gravité, elles sont supprimées au bout de 30 jours.
 */
function photoKey(): Buffer {
  const explicit = process.env.PHOTO_ENCRYPTION_KEY;
  if (explicit) {
    const key = Buffer.from(explicit, "base64");
    if (key.length !== 32) throw new Error("PHOTO_ENCRYPTION_KEY doit faire 32 octets (base64)");
    return key;
  }
  return Buffer.from(hkdfSync("sha256", env().BETTER_AUTH_SECRET, "devoirs-ia", "photos-v1", 32));
}

export interface Encrypted {
  iv: Buffer;
  tag: Buffer;
  data: Buffer;
}

export function encrypt(plain: Buffer): Encrypted {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", photoKey(), iv);
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return { iv, tag: cipher.getAuthTag(), data };
}

export function decrypt(e: Encrypted): Buffer {
  const decipher = createDecipheriv("aes-256-gcm", photoKey(), e.iv);
  decipher.setAuthTag(e.tag);
  return Buffer.concat([decipher.update(e.data), decipher.final()]);
}
