import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import { getParent } from "@/server/guards";

export const dynamic = "force-dynamic";

/** Back-office réservé au rôle ADMIN (404 pour les autres, pour ne pas révéler son existence). */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getParent(await headers());
  if (!user || user.role !== "ADMIN") notFound();
  return (
    <>
      <nav className="admin-nav" aria-label={t("admin.title")}>
        <Link href="/admin">{t("admin.nav.dashboard")}</Link>
        <Link href="/admin/exercices?statut=DRAFT">{t("admin.nav.queue")}</Link>
        <Link href="/admin/exercices">{t("admin.nav.exercises")}</Link>
        <Link href="/admin/referentiel">{t("admin.nav.referentiel")}</Link>
        <Link href="/admin/couts">{t("admin.nav.costs")}</Link>
        <Link href="/parent" style={{ marginLeft: "auto" }}>
          {t("admin.nav.backToSite")}
        </Link>
      </nav>
      <main className="admin-shell stack">{children}</main>
    </>
  );
}
