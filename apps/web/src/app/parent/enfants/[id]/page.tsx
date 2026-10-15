import { notFound } from "next/navigation";
import { ChildForm } from "@/components/ChildForm";
import { parentOrRedirect } from "@/server/page-guards";
import { getOwnedChild, toChildPublic } from "@/server/services/children";

export const dynamic = "force-dynamic";

export default async function EditChildPage({ params }: { params: Promise<{ id: string }> }) {
  const parent = await parentOrRedirect();
  const { id } = await params;
  const child = await getOwnedChild(parent.userId, id).catch(() => null);
  if (!child) notFound();
  return <ChildForm child={toChildPublic(child)} />;
}
