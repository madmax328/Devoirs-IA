import { referentiel } from "@devoirs/content";
import { EXERCISE_STATUSES, type ExerciseStatus } from "@devoirs/shared";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/ExercisePreview";
import { t } from "@/lib/i18n";
import { listExercises } from "@/server/services/exercises";

type Search = Promise<{ statut?: string; notion?: string; signales?: string; page?: string }>;

function href(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])));
  const s = q.toString();
  return `/admin/exercices${s ? `?${s}` : ""}`;
}

export default async function ExercisesPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const status = (EXERCISE_STATUSES as readonly string[]).includes(sp.statut ?? "")
    ? (sp.statut as ExerciseStatus)
    : undefined;
  const page = Math.max(0, Number(sp.page) || 0);
  const reported = sp.signales === "1";
  const { items, total, pageSize } = await listExercises({ status, notionId: sp.notion, reported, page });
  const ref = referentiel();
  const base = { notion: sp.notion };

  return (
    <>
      <h1>{status === "DRAFT" ? t("admin.exercises.queueTitle") : t("admin.exercises.title")}</h1>
      {sp.notion && <p className="muted">{ref.byId.get(sp.notion)?.title ?? sp.notion}</p>}
      <div className="filters">
        <Link href={href(base)} aria-current={!status && !reported}>
          {t("admin.exercises.filterAll")}
        </Link>
        {EXERCISE_STATUSES.map((s) => (
          <Link key={s} href={href({ ...base, statut: s })} aria-current={status === s}>
            {t(`exercise.statuses.${s}`)}
          </Link>
        ))}
        <Link href={href({ ...base, signales: "1" })} aria-current={reported}>
          {t("admin.exercises.filterReported")}
        </Link>
      </div>
      <p className="muted small">{t("admin.exercises.total", { n: total })}</p>
      {items.length === 0 ? (
        <p className="muted">{t("admin.exercises.empty")}</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("admin.detail.statement")}</th>
                <th>{t("admin.exercises.notion")}</th>
                <th>{t("admin.exercises.type")}</th>
                <th>{t("admin.exercises.status")}</th>
                <th>{t("admin.exercises.source")}</th>
                <th>{t("admin.exercises.reports")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e._id.toHexString()}>
                  <td>
                    <Link href={`/admin/exercices/${e._id.toHexString()}`}>
                      {e.statement.length > 110 ? `${e.statement.slice(0, 110)}…` : e.statement}
                    </Link>
                  </td>
                  <td className="small">
                    {e.notionIds.map((id) => ref.byId.get(id)?.title ?? id).join(", ")}
                    <br />
                    <span className="muted">
                      {t(`levels.${e.level}`)} · {t("admin.exercises.difficulty", { n: e.difficulty })}
                    </span>
                  </td>
                  <td>{t(`exercise.types.${e.type}`)}</td>
                  <td>
                    <StatusBadge status={e.status} />
                  </td>
                  <td>{t(`exercise.sources.${e.source}`)}</td>
                  <td>{e.openReports > 0 ? <strong className="error">{e.openReports}</strong> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="row">
        {page > 0 && (
          <Link
            className="btn btn-secondary"
            href={href({
              ...base,
              statut: status,
              signales: reported ? "1" : undefined,
              page: String(page - 1),
            })}
          >
            {t("admin.exercises.previous")}
          </Link>
        )}
        {(page + 1) * pageSize < total && (
          <Link
            className="btn btn-secondary"
            href={href({
              ...base,
              statut: status,
              signales: reported ? "1" : undefined,
              page: String(page + 1),
            })}
          >
            {t("admin.exercises.next")}
          </Link>
        )}
      </div>
    </>
  );
}
