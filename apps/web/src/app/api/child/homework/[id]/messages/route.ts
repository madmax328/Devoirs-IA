import { homeworkMessageSchema } from "@devoirs/shared";
import { requireChild } from "@/server/guards";
import { json, parseBody, route } from "@/server/http";
import { sendMessage } from "@/server/services/homework";

export const maxDuration = 120;

export const POST = route<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { child } = await requireChild(request.headers);
  const input = await parseBody(request, homeworkMessageSchema);
  return json(await sendMessage(child, (await params).id, input));
});
