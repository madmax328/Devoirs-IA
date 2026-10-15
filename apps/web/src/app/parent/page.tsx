import { MAX_CHILDREN_PER_PARENT } from "@devoirs/shared";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { t } from "@/lib/i18n";
import { parentOrRedirect } from "@/server/page-guards";
import { listChildren } from "@/server/services/children";

export const dynamic = "force-dynamic";

export default async function ParentDashboard() {
  const parent = await parentOrRedirect();
  const children = await listChildren(parent.userId);
  const canAdd = children.length < MAX_CHILDREN_PER_PARENT;

  return (
    <div className="stack">
      <div className="row spread">
        <h1>{t("parent.dashboardTitle")}</h1>
        {children.length > 0 && (
          <Link className="btn btn-accent" href="/enfant">
            {t("parent.openChildSpace")}
          </Link>
        )}
      </div>

      {children.length === 0 && <p className="muted">{t("parent.noChildren")}</p>}

      {children.map((child) => (
        <Link
          key={child.id}
          href={`/parent/enfants/${child.id}`}
          className="card row"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <Avatar id={child.avatar} />
          <div>
            <strong>{child.displayName}</strong>
            <div className="muted small">
              {t("parent.levelLabel")} : {t(`levels.${child.level}`)} ·{" "}
              {child.settings.subjects.map((s) => t(`subjects.${s}`)).join(", ")}
            </div>
          </div>
        </Link>
      ))}

      {canAdd ? (
        <Link className="btn" href="/parent/enfants/nouveau">
          {t("parent.addChild")}
        </Link>
      ) : (
        <p className="muted">{t("parent.maxChildren", { max: MAX_CHILDREN_PER_PARENT })}</p>
      )}
    </div>
  );
}
