import { z } from "zod";
import { auth } from "@/server/auth";
import { requireParent } from "@/server/guards";
import { HttpError, json, parseBody, route } from "@/server/http";

const bodySchema = z.object({ password: z.string().min(1, "errors.required").max(128) });

/**
 * Retour de l'espace enfant vers l'espace parent sur un appareil partagé :
 * le parent doit retaper son mot de passe.
 */
export const POST = route(async (request) => {
  await requireParent(request.headers);
  const { password } = await parseBody(request, bodySchema);
  try {
    await auth().api.verifyPassword({ headers: request.headers, body: { password } });
  } catch {
    throw new HttpError(401, "WRONG_PASSWORD", "auth.invalidCredentials");
  }
  return json({ ok: true });
});
