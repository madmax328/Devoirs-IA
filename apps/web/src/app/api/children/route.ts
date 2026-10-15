import { createChildSchema } from "@devoirs/shared";
import { requireParent } from "@/server/guards";
import { json, parseBody, route } from "@/server/http";
import { createChild, listChildren } from "@/server/services/children";

export const GET = route(async (request) => {
  const parent = await requireParent(request.headers);
  return json({ children: await listChildren(parent.userId) });
});

export const POST = route(async (request) => {
  const parent = await requireParent(request.headers);
  const input = await parseBody(request, createChildSchema);
  return json({ child: await createChild(parent.userId, input) }, { status: 201 });
});
