import { collections } from "@devoirs/db";
import { MAX_CHILDREN_PER_PARENT, PIN_MAX_FAILURES, type ChildPublic } from "@devoirs/shared";
import { describe, expect, it } from "vitest";
import { POST as childSessionPost } from "@/app/api/child-session/route";
import { GET as childMe } from "@/app/api/child/me/route";
import { DELETE as childDelete, PATCH as childPatch } from "@/app/api/children/[id]/route";
import { GET as childrenGet, POST as childrenPost } from "@/app/api/children/route";
import { GET as meGet } from "@/app/api/me/route";
import { jsonRequest, signUpParent, validChild } from "./helpers";

const noCtx = undefined as never;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function createChild(headers: Headers, body: object = validChild): Promise<ChildPublic> {
  const res = await childrenPost(jsonRequest("/api/children", "POST", headers, body), noCtx);
  expect(res.status).toBe(201);
  return ((await res.json()) as { child: ChildPublic }).child;
}

describe("authentification parent", () => {
  it("refuse l'accès sans session", async () => {
    const res = await meGet(jsonRequest("/api/me", "GET", new Headers()), noCtx);
    expect(res.status).toBe(401);
  });

  it("renvoie le parent connecté avec le rôle PARENT", async () => {
    const { headers, email } = await signUpParent();
    const res = await meGet(jsonRequest("/api/me", "GET", headers), noCtx);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ user: { email, role: "PARENT" } });
  });

  it("stocke le mot de passe haché en argon2id", async () => {
    const { userId } = await signUpParent();
    const { getDb, ObjectId } = await import("@devoirs/db");
    const account = await getDb()
      .collection("account")
      .findOne({ userId: new ObjectId(userId) });
    expect(String(account?.password)).toMatch(/^\$argon2id\$/);
  });
});

describe("profils enfants", () => {
  it("crée un profil, hache le PIN et enregistre le consentement", async () => {
    const { headers, userId } = await signUpParent();
    const child = await createChild(headers);
    expect(child).toMatchObject({ displayName: "Léa", level: "SIXIEME", settings: { sessionMinutes: 10 } });
    expect(child).not.toHaveProperty("pinHash");

    const doc = await collections().children.findOne({ parentId: userId });
    expect(doc?.pinHash).toMatch(/^\$argon2id\$/);
    const consent = await collections().consents.findOne({ childId: child.id });
    expect(consent).toMatchObject({ userId, type: "PARENTAL_CHILD_PROFILE", granted: true });
    expect(consent?.textHash).toHaveLength(64);
  });

  it("refuse la création sans consentement (message traduisible)", async () => {
    const { headers } = await signUpParent();
    const res = await childrenPost(
      jsonRequest("/api/children", "POST", headers, { ...validChild, parentalConsent: false }),
      noCtx,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: "VALIDATION", message: "errors.mustConsent" } });
  });

  it(`limite à ${MAX_CHILDREN_PER_PARENT} profils`, async () => {
    const { headers } = await signUpParent();
    for (let i = 0; i < MAX_CHILDREN_PER_PARENT; i++) await createChild(headers);
    const res = await childrenPost(jsonRequest("/api/children", "POST", headers, validChild), noCtx);
    expect(res.status).toBe(409);
  });

  it("n'expose jamais les enfants d'un autre parent", async () => {
    const a = await signUpParent();
    const b = await signUpParent();
    const child = await createChild(a.headers);

    const list = await childrenGet(jsonRequest("/api/children", "GET", b.headers), noCtx);
    expect(((await list.json()) as { children: unknown[] }).children).toHaveLength(0);

    const patch = await childPatch(
      jsonRequest(`/api/children/${child.id}`, "PATCH", b.headers, { displayName: "Pirate" }),
      ctx(child.id),
    );
    expect(patch.status).toBe(404);
    const del = await childDelete(
      jsonRequest(`/api/children/${child.id}`, "DELETE", b.headers),
      ctx(child.id),
    );
    expect(del.status).toBe(404);
  });

  it("modifie les réglages sans écraser les autres", async () => {
    const { headers } = await signUpParent();
    const child = await createChild(headers);
    const res = await childPatch(
      jsonRequest(`/api/children/${child.id}`, "PATCH", headers, { settings: { dysFont: true } }),
      ctx(child.id),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      child: { settings: { dysFont: true, subjects: ["MATHS", "FRANCAIS"] } },
    });
  });

  it("supprime le profil et ses données rattachées", async () => {
    const { headers } = await signUpParent();
    const child = await createChild(headers);
    await childSessionPost(
      jsonRequest("/api/child-session", "POST", headers, { childId: child.id, pin: "4821" }),
      noCtx,
    );

    const res = await childDelete(jsonRequest(`/api/children/${child.id}`, "DELETE", headers), ctx(child.id));
    expect(res.status).toBe(204);
    const c = collections();
    expect(await c.consents.countDocuments({ childId: child.id })).toBe(0);
    expect(await c.childSessions.countDocuments({ childId: child.id })).toBe(0);
  });
});

describe("espace enfant (PIN)", () => {
  it("ouvre une session avec le bon PIN et donne accès à /api/child/me", async () => {
    const { headers } = await signUpParent();
    const child = await createChild(headers);
    const res = await childSessionPost(
      jsonRequest("/api/child-session", "POST", headers, { childId: child.id, pin: "4821" }),
      noCtx,
    );
    expect(res.status).toBe(200);
    const { token } = (await res.json()) as { token: string };
    expect(res.headers.get("set-cookie")).toContain("devoirs_child=");

    const me = await childMe(
      jsonRequest("/api/child/me", "GET", new Headers({ "x-child-session": token })),
      noCtx,
    );
    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ child: { id: child.id } });

    // Le jeton n'est stocké que sous forme d'empreinte.
    expect(await collections().childSessions.countDocuments({ tokenHash: token })).toBe(0);
  });

  it("refuse un jeton enfant invalide", async () => {
    const me = await childMe(
      jsonRequest("/api/child/me", "GET", new Headers({ "x-child-session": "faux" })),
      noCtx,
    );
    expect(me.status).toBe(401);
  });

  it("refuse un mauvais PIN puis verrouille après plusieurs essais", async () => {
    const { headers } = await signUpParent();
    const child = await createChild(headers);
    const attempt = () =>
      childSessionPost(
        jsonRequest("/api/child-session", "POST", headers, { childId: child.id, pin: "0000" }),
        noCtx,
      );

    for (let i = 1; i < PIN_MAX_FAILURES; i++) expect((await attempt()).status).toBe(401);
    const locked = await attempt();
    expect(locked.status).toBe(423);
    expect(await locked.json()).toMatchObject({ error: { code: "PIN_LOCKED", details: { minutes: 1 } } });

    // Même le bon PIN est refusé pendant le blocage.
    const good = await childSessionPost(
      jsonRequest("/api/child-session", "POST", headers, { childId: child.id, pin: "4821" }),
      noCtx,
    );
    expect(good.status).toBe(423);
  });

  it("refuse d'ouvrir le profil d'un enfant d'un autre parent", async () => {
    const a = await signUpParent();
    const b = await signUpParent();
    const child = await createChild(a.headers);
    const res = await childSessionPost(
      jsonRequest("/api/child-session", "POST", b.headers, { childId: child.id, pin: "4821" }),
      noCtx,
    );
    expect(res.status).toBe(404);
  });

  it("déconnecte l'enfant quand le parent change le PIN", async () => {
    const { headers } = await signUpParent();
    const child = await createChild(headers);
    const login = await childSessionPost(
      jsonRequest("/api/child-session", "POST", headers, { childId: child.id, pin: "4821" }),
      noCtx,
    );
    const { token } = (await login.json()) as { token: string };
    await childPatch(
      jsonRequest(`/api/children/${child.id}`, "PATCH", headers, { pin: "1357" }),
      ctx(child.id),
    );
    const me = await childMe(
      jsonRequest("/api/child/me", "GET", new Headers({ "x-child-session": token })),
      noCtx,
    );
    expect(me.status).toBe(401);
  });
});

describe("inscription", () => {
  it("refuse l'inscription sans acceptation des CGU", async () => {
    const { auth } = await import("@/server/auth");
    const res = await auth().handler(
      jsonRequest("/api/auth/sign-up/email", "POST", new Headers({ origin: "http://localhost:3000" }), {
        name: "Sans CGU",
        email: `sans-cgu-${Date.now()}@exemple.fr`,
        password: "motdepasse-solide",
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ message: "errors.mustAcceptTerms" });
  });

  it("enregistre le consentement CGU et confidentialité, horodaté et versionné", async () => {
    const { userId } = await signUpParent();
    const consents = await collections().consents.find({ userId }).toArray();
    expect(consents.map((c) => c.type).sort()).toEqual(["PRIVACY", "TERMS"]);
    expect(consents[0]?.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
