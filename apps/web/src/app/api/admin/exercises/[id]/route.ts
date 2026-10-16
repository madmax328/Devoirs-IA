import { requireAdmin } from "@/server/guards";
import { json, parseBody, route } from "@/server/http";
import { getExerciseDetail, updateExerciseContent } from "@/server/services/exercises";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (request, { params }) => {
  await requireAdmin(request.headers);
  return json(await getExerciseDetail((await params).id));
});

/** Correction du contenu d'un exercice (JSON validé par le même schéma que l'IA). */
export const PATCH = route<Ctx>(async (request, { params }) => {
  const admin = await requireAdmin(request.headers);
  const { content } = await parseBody(request, z.object({ content: z.unknown() }));
  return json({ exercise: await updateExerciseContent(admin.userId, (await params).id, content) });
});
