import { requireChild } from "@/server/guards";
import { route } from "@/server/http";
import { getPhoto } from "@/server/services/homework";

/** Photo déchiffrée à la volée, jamais mise en cache. */
export const GET = route<{ params: Promise<{ id: string; index: string }> }>(async (request, { params }) => {
  const { child } = await requireChild(request.headers);
  const { id, index } = await params;
  const photo = await getPhoto(child, id, Number(index));
  return new Response(new Uint8Array(photo.data), {
    headers: { "Content-Type": photo.mediaType, "Cache-Control": "private, no-store" },
  });
});
