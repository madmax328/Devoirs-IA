import { getDb } from "@devoirs/db";
import { json } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDb().command({ ping: 1 });
    return json({ status: "ok" });
  } catch {
    return json({ status: "degraded" }, { status: 503 });
  }
}
