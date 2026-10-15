import { updateChildSchema } from "@devoirs/shared";
import { requireParent } from "@/server/guards";
import { json, parseBody, route } from "@/server/http";
import { deleteChild, getOwnedChild, toChildPublic, updateChild } from "@/server/services/children";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (request, { params }) => {
  const parent = await requireParent(request.headers);
  const { id } = await params;
  return json({ child: toChildPublic(await getOwnedChild(parent.userId, id)) });
});

export const PATCH = route<Ctx>(async (request, { params }) => {
  const parent = await requireParent(request.headers);
  const { id } = await params;
  const input = await parseBody(request, updateChildSchema);
  return json({ child: await updateChild(parent.userId, id, input) });
});

export const DELETE = route<Ctx>(async (request, { params }) => {
  const parent = await requireParent(request.headers);
  const { id } = await params;
  await deleteChild(parent.userId, id);
  return new Response(null, { status: 204 });
});
