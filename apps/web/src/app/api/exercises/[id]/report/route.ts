import { exerciseReportSchema } from "@devoirs/shared";
import { getParent, readChildToken } from "@/server/guards";
import { errors, json, parseBody, route } from "@/server/http";
import { getChildSessionFromToken } from "@/server/services/child-auth";
import { reportExercise } from "@/server/services/exercises";

/** « Signaler une erreur » : possible depuis l'espace enfant ou l'espace parent. */
export const POST = route<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const input = await parseBody(request, exerciseReportSchema);
  const token = readChildToken(request.headers);
  const child = token ? await getChildSessionFromToken(token) : null;
  const reporter = child
    ? { type: "CHILD" as const, id: child.child.id }
    : await getParent(request.headers).then((p) => (p ? { type: "PARENT" as const, id: p.userId } : null));
  if (!reporter) throw errors.unauthorized();
  await reportExercise(reporter, (await params).id, input);
  return json({ ok: true }, { status: 201 });
});
