import { diagnosticAnswerSchema } from "@devoirs/shared";
import { requireChild } from "@/server/guards";
import { json, parseBody, route } from "@/server/http";
import { answer } from "@/server/services/diagnostic";

export const POST = route<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { child } = await requireChild(request.headers);
  const input = await parseBody(request, diagnosticAnswerSchema);
  return json(await answer(child, (await params).id, input));
});
