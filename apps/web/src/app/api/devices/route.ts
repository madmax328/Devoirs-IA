import { registerDeviceSchema } from "@devoirs/shared";
import { requireParent } from "@/server/guards";
import { json, parseBody, route } from "@/server/http";
import { registerDevice } from "@/server/services/devices";

export const POST = route(async (request) => {
  const parent = await requireParent(request.headers);
  const input = await parseBody(request, registerDeviceSchema);
  return json({ device: await registerDevice(parent.userId, input) }, { status: 201 });
});
