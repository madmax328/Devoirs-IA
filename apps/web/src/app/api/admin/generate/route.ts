import { requireAdmin } from "@/server/guards";
import { json, parseBody, route } from "@/server/http";
import { generateForNotion } from "@/server/services/exercises";
import { NOTION_ID_REGEX } from "@devoirs/shared";
import { z } from "zod";

// Génération + relecture : plusieurs appels IA, on laisse jusqu'à 5 minutes.
export const maxDuration = 300;

const bodySchema = z.object({
  notionId: z.string().regex(NOTION_ID_REGEX),
  count: z.number().int().min(1).max(5),
});

export const POST = route(async (request) => {
  const admin = await requireAdmin(request.headers);
  const { notionId, count } = await parseBody(request, bodySchema);
  return json(await generateForNotion(admin.userId, notionId, count));
});
