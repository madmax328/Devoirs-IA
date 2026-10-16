import { requireChild } from "@/server/guards";
import { json, route } from "@/server/http";
import { getHomework } from "@/server/services/homework";

export const GET = route<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { child } = await requireChild(request.headers);
  return json(await getHomework(child, (await params).id));
});
