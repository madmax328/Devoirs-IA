import { requireParent } from "@/server/guards";
import { json, route } from "@/server/http";
import { markNotificationRead } from "@/server/services/safety";

export const POST = route<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const parent = await requireParent(request.headers);
  await markNotificationRead(parent.userId, (await params).id);
  return json({ ok: true });
});
