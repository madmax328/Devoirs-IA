import { createHomeworkSchema } from "@devoirs/shared";
import { requireChild } from "@/server/guards";
import { json, parseBody, route } from "@/server/http";
import { createHomework, listHomework } from "@/server/services/homework";

// Lecture de photo par l'IA : jusqu'à 2 minutes.
export const maxDuration = 120;

export const GET = route(async (request) => {
  const { child } = await requireChild(request.headers);
  return json({ items: await listHomework(child) });
});

export const POST = route(async (request) => {
  const { child, parentId } = await requireChild(request.headers);
  const input = await parseBody(request, createHomeworkSchema);
  return json(await createHomework(child, parentId, input), { status: 201 });
});
