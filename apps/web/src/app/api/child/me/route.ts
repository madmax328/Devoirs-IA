import { requireChild } from "@/server/guards";
import { json, route } from "@/server/http";

export const GET = route(async (request) => {
  const { child } = await requireChild(request.headers);
  return json({ child });
});
