import { expo } from "@better-auth/expo";
import { getDb, getMongoClient } from "@devoirs/db";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { env } from "./env";
import { hashSecret, verifySecret } from "./hashing";
import { recordSignupConsents } from "./services/consents";

const SIGN_UP_EMAIL = "/sign-up/email";

function createAuth() {
  const e = env();
  const client = getMongoClient(e.MONGODB_URI);

  const socialProviders: Parameters<typeof betterAuth>[0]["socialProviders"] = {};
  if (e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = { clientId: e.GOOGLE_CLIENT_ID, clientSecret: e.GOOGLE_CLIENT_SECRET };
  }
  if (e.APPLE_CLIENT_ID && e.APPLE_CLIENT_SECRET) {
    socialProviders.apple = {
      clientId: e.APPLE_CLIENT_ID,
      clientSecret: e.APPLE_CLIENT_SECRET,
      ...(e.APPLE_APP_BUNDLE_IDENTIFIER ? { appBundleIdentifier: e.APPLE_APP_BUNDLE_IDENTIFIER } : {}),
    };
  }

  return betterAuth({
    appName: "Devoirs IA",
    secret: e.BETTER_AUTH_SECRET,
    baseURL: e.BETTER_AUTH_URL,
    database: mongodbAdapter(getDb(client), { client }),
    trustedOrigins: [
      e.MOBILE_APP_SCHEME,
      ...e.TRUSTED_ORIGINS.split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    ],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      // Envoi d'e-mails pas encore branché : voir docs/RESTE-A-FAIRE.md.
      requireEmailVerification: false,
      password: { hash: hashSecret, verify: ({ hash, password }) => verifySecret(hash, password) },
    },
    socialProviders,
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "PARENT", input: false },
      },
    },
    hooks: {
      // L'acceptation des CGU / politique de confidentialité est obligatoire à l'inscription.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== SIGN_UP_EMAIL) return;
        const body = ctx.body as { acceptTerms?: unknown } | undefined;
        if (body?.acceptTerms !== true) {
          throw new APIError("BAD_REQUEST", { message: "errors.mustAcceptTerms", code: "TERMS_REQUIRED" });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        const userId = ctx.context.newSession?.user.id;
        if (ctx.path === SIGN_UP_EMAIL && userId) await recordSignupConsents(userId);
      }),
    },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, window: 60, max: 30, storage: "database" },
    advanced: { useSecureCookies: e.BETTER_AUTH_URL.startsWith("https://") },
    plugins: [expo(), nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

let instance: Auth | null = null;
export function auth(): Auth {
  return (instance ??= createAuth());
}
