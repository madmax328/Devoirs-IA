import Link from "next/link";
import { redirect } from "next/navigation";
import { ChildPicker } from "@/components/ChildPicker";
import { t } from "@/lib/i18n";
import { parentOrRedirect } from "@/server/page-guards";
import { listChildren } from "@/server/services/children";

export const dynamic = "force-dynamic";

/** Choix du profil + PIN. Le parent doit être connecté sur cet appareil. */
export default async function ChildEntryPage() {
  const parent = await parentOrRedirect();
  const children = await listChildren(parent.userId);
  if (children.length === 0) redirect("/parent");

  return (
    <main className="container stack">
      <ChildPicker childProfiles={children} />
      <Link href="/parent" className="small" style={{ textAlign: "center" }}>
        {t("childSpace.parentArea")}
      </Link>
    </main>
  );
}
