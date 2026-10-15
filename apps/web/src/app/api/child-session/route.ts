import { childLoginSchema } from "@devoirs/shared";
import { CHILD_SESSION_COOKIE, readChildToken, requireParent } from "@/server/guards";
import { json, parseBody, route } from "@/server/http";
import { loginChild, logoutChild } from "@/server/services/child-auth";

/** Ouvre l'espace enfant. Le jeton est renvoyé (mobile) et posé en cookie httpOnly (web). */
export const POST = route(async (request) => {
  const parent = await requireParent(request.headers);
  const { childId, pin } = await parseBody(request, childLoginSchema);
  const result = await loginChild(parent.userId, childId, pin);
  const res = json({ token: result.token, expiresAt: result.expiresAt.toISOString(), child: result.child });
  res.cookies.set(CHILD_SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: result.expiresAt,
  });
  return res;
});

export const DELETE = route(async (request) => {
  const token = readChildToken(request.headers);
  if (token) await logoutChild(token);
  const res = new Response(null, { status: 204 });
  res.headers.append("Set-Cookie", `${CHILD_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  return res;
});
