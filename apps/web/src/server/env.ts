import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET doit faire au moins 32 caractères"),
  /** URL publique du site. Sur Vercel, déduite automatiquement si absente. */
  BETTER_AUTH_URL: z.url(),
  /** Schéma d'URL de l'app mobile (deep links), ex. "devoirsia://". */
  MOBILE_APP_SCHEME: z.string().default("devoirsia://"),
  /** Origines supplémentaires autorisées (dev Expo : http://localhost:8081), séparées par des virgules. */
  TRUSTED_ORIGINS: z.string().default(""),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_SECRET: z.string().optional(),
  APPLE_APP_BUNDLE_IDENTIFIER: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse({ ...process.env, BETTER_AUTH_URL: publicUrl() });
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Variables d'environnement invalides :\n${details}`);
  }
  cached = parsed.data;
  return cached;
}

function publicUrl(): string | undefined {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  // Variables fournies par Vercel : domaine de production, sinon URL du déploiement (préversions).
  const host =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_URL;
  return host ? `https://${host}` : undefined;
}
