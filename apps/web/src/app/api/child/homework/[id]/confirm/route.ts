import { confirmHomeworkSchema } from "@devoirs/shared";
import { requireChild } from "@/server/guards";
import { json, parseBody, route } from "@/server/http";
import { confirmHomework } from "@/server/services/homework";

export const maxDuration = 120;

export const POST = route<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { child } = await requireChild(request.headers);
  const { correctedStatement } = await parseBody(request, confirmHomeworkSchema);
  return json(await confirmHomework(child, (await params).id, correctedStatement));
});
