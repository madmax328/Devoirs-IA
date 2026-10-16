import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ChildLogoutButton } from "@/components/ChildLogoutButton";
import { Coach } from "@/components/child/Coach";
import { t } from "@/lib/i18n";
import { childOrRedirect } from "@/server/page-guards";
import { overview } from "@/server/services/diagnostic";

export const dynamic = "force-dynamic";

export default async function ChildHomePage() {
  const { child } = await childOrRedirect();
  const items = await overview(child);
  const firstTime = items.every((i) => i.status === "NOT_STARTED" || i.status === "UNAVAILABLE");

  return (
    <main className={child.settings.dysFont ? "container stack dys" : "container stack"}>
      <div className="row">
        <Avatar id={child.avatar} />
        <h1 style={{ margin: 0 }}>{t("childSpace.hello", { name: child.displayName })}</h1>
      </div>

      {firstTime ? (
        <Coach>
          <p>
            <strong>{t("coach.hello", { name: child.displayName })}</strong>
          </p>
          <p>{t("coach.intro1")}</p>
          <p>{t("coach.intro2")}</p>
          <p>{t("coach.intro3")}</p>
        </Coach>
      ) : (
        <Coach>
          <p>{t("diagnostic.subtitle")}</p>
        </Coach>
      )}

      <Link
        className="card subject-card"
        href="/enfant/devoirs"
        style={{ textDecoration: "none", color: "inherit", borderColor: "var(--c-primary)", borderWidth: 2 }}
      >
        <div>
          <strong>📷 {t("homework.newHelp")}</strong>
          <div className="muted small">{t("homework.newHelpHint")}</div>
        </div>
      </Link>

      <section className="stack" style={{ gap: 12 }}>
        <h2>{t("diagnostic.title")}</h2>
        {items.map((item) => (
          <div key={item.subject} className="card subject-card">
            <div>
              <strong>{t(`subjects.${item.subject}`)}</strong>
              {item.status === "IN_PROGRESS" && item.progress && (
                <div className="muted small">
                  {t("diagnostic.progress", { n: item.progress.asked, max: item.progress.max })}
                </div>
              )}
              {item.status === "COMPLETED" && item.summary && (
                <div className="muted small">
                  ✓ {item.summary.mastered.length} · {t("diagnostic.toWorkTitle").toLowerCase()} :{" "}
                  {item.summary.toWork.length}
                </div>
              )}
              {item.status === "UNAVAILABLE" && (
                <div className="muted small">{t("diagnostic.unavailableMessage")}</div>
              )}
            </div>
            {item.status === "NOT_STARTED" && (
              <Link className="btn" href={`/enfant/diagnostic/${item.subject}`}>
                {firstTime ? t("coach.letsGo") : t("diagnostic.start")}
              </Link>
            )}
            {item.status === "IN_PROGRESS" && (
              <Link className="btn" href={`/enfant/diagnostic/${item.subject}`}>
                {t("diagnostic.resume")}
              </Link>
            )}
            {item.status === "COMPLETED" && (
              <span className="badge badge-HUMAN_VALIDATED">{t("diagnostic.done")}</span>
            )}
            {item.status === "UNAVAILABLE" && <span className="badge">{t("diagnostic.unavailable")}</span>}
          </div>
        ))}
      </section>
      <ChildLogoutButton />
    </main>
  );
}
