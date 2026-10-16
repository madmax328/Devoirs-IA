import { diagnosticStartSchema } from "@devoirs/shared";
import { requireChild } from "@/server/guards";
import { json, parseBody, route } from "@/server/http";
import { overview, startOrResume } from "@/server/services/diagnostic";

/** État du diagnostic pour chaque matière suivie. */
export const GET = route(async (request) => {
  const { child } = await requireChild(request.headers);
  return json({ items: await overview(child) });
});

/** Démarre (ou reprend) le diagnostic d'une matière. */
export const POST = route(async (request) => {
  const { child } = await requireChild(request.headers);
  const { subject } = await parseBody(request, diagnosticStartSchema);
  return json(await startOrResume(child, subject));
});
