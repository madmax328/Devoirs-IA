import { requireChild } from "@/server/guards";
import { json, route } from "@/server/http";
import { abandonHomework } from "@/server/services/homework";

export const POST = route<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { child } = await requireChild(request.headers);
  await abandonHomework(child, (await params).id);
  return json({ ok: true });
});
