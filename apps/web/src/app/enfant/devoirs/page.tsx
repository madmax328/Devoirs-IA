import Link from "next/link";
import { t } from "@/lib/i18n";
import { childOrRedirect } from "@/server/page-guards";
import { listHomework } from "@/server/services/homework";

export const dynamic = "force-dynamic";

export default async function HomeworkListPage() {
  const { child } = await childOrRedirect();
  const items = await listHomework(child);
  return (
    <main className={child.settings.dysFont ? "container stack dys" : "container stack"}>
      <h1>{t("homework.title")}</h1>
      <Link className="btn btn-block" href="/enfant/devoirs/nouveau">
        📷 {t("homework.newHelp")}
      </Link>
      <h2>{t("homework.historyTitle")}</h2>
      {items.length === 0 && <p className="muted">{t("homework.historyEmpty")}</p>}
      {items.map((h) => (
        <Link
          key={h.id}
          href={`/enfant/devoirs/${h.id}`}
          className="card subject-card"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div>
            <strong>{h.subject ? t(`subjects.${h.subject}`) : t("homework.newHelp")}</strong>
            <div className="muted small">
              {new Date(h.createdAt).toLocaleDateString("fr-FR")}{" "}
              {h.exerciseKind ? `· ${h.exerciseKind}` : ""}
            </div>
          </div>
          <span className="badge">{t(`homework.statuses.${h.status}`)}</span>
        </Link>
      ))}
      <Link className="btn btn-secondary btn-block" href="/enfant/accueil">
        {t("diagnostic.backHome")}
      </Link>
    </main>
  );
}
