import { notFound } from "next/navigation";
import { HomeworkSession } from "@/components/child/HomeworkSession";
import { childOrRedirect } from "@/server/page-guards";
import { getHomework } from "@/server/services/homework";

export const dynamic = "force-dynamic";

export default async function HomeworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { child } = await childOrRedirect();
  const hw = await getHomework(child, (await params).id).catch(() => null);
  if (!hw) notFound();
  return (
    <main className={child.settings.dysFont ? "container stack dys" : "container stack"}>
      <HomeworkSession initial={hw} />
    </main>
  );
}
