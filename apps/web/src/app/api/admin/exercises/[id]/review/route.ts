import { requireAdmin } from "@/server/guards";
import { json, parseBody, route } from "@/server/http";
import { reviewExercise } from "@/server/services/exercises";
import { z } from "zod";

const bodySchema = z.object({
  verdict: z.enum(["HUMAN_VALIDATED", "REJECTED", "DRAFT"]),
  notes: z.string().trim().max(1000).optional(),
});

export const POST = route<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const admin = await requireAdmin(request.headers);
  const { verdict, notes } = await parseBody(request, bodySchema);
  const exercise = await reviewExercise(admin.userId, (await params).id, verdict, notes ?? null);
  return json({ status: exercise.status });
});
