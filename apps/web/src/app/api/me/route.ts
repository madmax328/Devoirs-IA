import { requireParent } from "@/server/guards";
import { json, route } from "@/server/http";

export const GET = route(async (request) => {
  const parent = await requireParent(request.headers);
  return json({ user: parent });
});
