import { auth } from "@/server/auth";

let counter = 0;

/** Crée un parent via Better Auth et renvoie les en-têtes (cookie de session) à réutiliser. */
export async function signUpParent(
  name = "Parent Test",
  emailOverride?: string,
): Promise<{ headers: Headers; userId: string; email: string }> {
  counter += 1;
  const email = emailOverride ?? `parent${counter}-${Date.now()}@exemple.fr`;
  const res = await auth().api.signUpEmail({
    body: { name, email, password: "motdepasse-solide", acceptTerms: true } as never,
    asResponse: true,
  });
  if (!res.ok) throw new Error(`Inscription échouée : ${res.status} ${await res.text()}`);
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const body = (await res.json()) as { user: { id: string } };
  return { headers: new Headers({ cookie, origin: "http://localhost:3000" }), userId: body.user.id, email };
}

export function jsonRequest(url: string, method: string, headers: Headers, body?: unknown): Request {
  const h = new Headers(headers);
  if (body !== undefined) h.set("content-type", "application/json");
  return new Request(`http://localhost:3000${url}`, {
    method,
    headers: h,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

export const validChild = {
  displayName: "Léa",
  level: "SIXIEME",
  avatar: "renard",
  pin: "4821",
  parentalConsent: true,
} as const;
