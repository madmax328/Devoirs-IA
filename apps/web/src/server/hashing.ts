import { hash, verify } from "@node-rs/argon2";

// Argon2id, paramètres recommandés OWASP (19 Mio, 2 itérations).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashSecret(secret: string): Promise<string> {
  return hash(secret, OPTIONS);
}

export async function verifySecret(hashed: string, secret: string): Promise<boolean> {
  try {
    return await verify(hashed, secret);
  } catch {
    return false;
  }
}
