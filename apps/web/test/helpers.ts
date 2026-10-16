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

/** Crée un parent, un enfant et ouvre la session enfant. */
export async function childWithSession(
  child: Record<string, unknown> = {},
): Promise<{ parentHeaders: Headers; childHeaders: Headers; childId: string }> {
  const { POST: childrenPost } = await import("@/app/api/children/route");
  const { POST: childSessionPost } = await import("@/app/api/child-session/route");
  const { headers } = await signUpParent();
  const res = await childrenPost(
    jsonRequest("/api/children", "POST", headers, { ...validChild, ...child }),
    undefined as never,
  );
  const { child: created } = (await res.json()) as { child: { id: string } };
  const login = await childSessionPost(
    jsonRequest("/api/child-session", "POST", headers, { childId: created.id, pin: validChild.pin }),
    undefined as never,
  );
  const { token } = (await login.json()) as { token: string };
  return {
    parentHeaders: headers,
    childHeaders: new Headers({ "x-child-session": token }),
    childId: created.id,
  };
}
