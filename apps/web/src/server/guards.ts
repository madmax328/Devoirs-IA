import type { UserRole } from "@devoirs/db";
import { auth } from "./auth";
import { errors } from "./http";
import { getChildSessionFromToken, type ChildSessionContext } from "./services/child-auth";

export interface ParentContext {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * Comptes admin désignés par la variable ADMIN_EMAILS (adresses séparées par des virgules).
 * Pratique sur Vercel : pas besoin de modifier la base pour devenir admin.
 */
export function isAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

export async function getParent(headers: Headers): Promise<ParentContext | null> {
  const session = await auth().api.getSession({ headers });
  if (!session) return null;
  const role =
    (session.user as { role?: string }).role === "ADMIN" || isAdminEmail(session.user.email)
      ? "ADMIN"
      : "PARENT";
  return { userId: session.user.id, email: session.user.email, name: session.user.name, role };
}

export async function requireParent(headers: Headers): Promise<ParentContext> {
  const parent = await getParent(headers);
  if (!parent) throw errors.unauthorized();
  return parent;
}

export async function requireAdmin(headers: Headers): Promise<ParentContext> {
  const user = await requireParent(headers);
  if (user.role !== "ADMIN") throw errors.forbidden();
  return user;
}

export const CHILD_SESSION_HEADER = "x-child-session";
export const CHILD_SESSION_COOKIE = "devoirs_child";

function readCookie(headers: Headers, name: string): string | null {
  const raw = headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

/** Mobile : en-tête x-child-session. Web : cookie httpOnly. */
export function readChildToken(headers: Headers): string | null {
  return headers.get(CHILD_SESSION_HEADER) ?? readCookie(headers, CHILD_SESSION_COOKIE);
}

export async function requireChild(headers: Headers): Promise<ChildSessionContext> {
  const token = readChildToken(headers);
  const ctx = token ? await getChildSessionFromToken(token) : null;
  if (!ctx) throw errors.unauthorized();
  return ctx;
}
