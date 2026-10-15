import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { t } from "@/lib/i18n";
import { getParent } from "@/server/guards";

export const dynamic = "force-dynamic";

/** Back-office : réservé au rôle ADMIN. Le contenu arrive au jalon 2 (validation des exercices). */
export default async function AdminPage() {
  const user = await getParent(await headers());
  // On répond 404 plutôt que 403 pour ne pas révéler l'existence de la page.
  if (!user || user.role !== "ADMIN") notFound();
  return (
    <main className="container stack">
      <h1>{t("admin.title")}</h1>
      <p className="muted">{t("admin.signedInAs", { email: user.email })}</p>
    </main>
  );
}
