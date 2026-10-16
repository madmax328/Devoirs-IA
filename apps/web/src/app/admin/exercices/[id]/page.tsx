import { referentiel } from "@devoirs/content";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnswerPreview, StatusBadge } from "@/components/admin/ExercisePreview";
import { JsonEditor } from "@/components/admin/JsonEditor";
import { ReviewActions } from "@/components/admin/ReviewActions";
import { t } from "@/lib/i18n";
import { getExerciseDetail } from "@/server/services/exercises";

export default async function ExerciseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getExerciseDetail(id).catch(() => null);
  if (!detail) notFound();
  const { exercise: e, reviews, reports } = detail;
  const ref = referentiel();
  const content = {
    notionIds: e.notionIds,
    level: e.level,
    difficulty: e.difficulty,
    statement: e.statement,
    answer: e.answer,
    explanation: e.explanation,
    hints: e.hints,
  };
  const mathCheck = typeof e.genMeta?.mathCheck === "string" ? e.genMeta.mathCheck : null;

  return (
    <>
      <div className="row spread">
        <h1>{t(`exercise.types.${e.type}`)}</h1>
        <StatusBadge status={e.status} />
      </div>
      <p className="muted small">
        {e.notionIds.map((nid) => (
          <Link key={nid} href={`/admin/exercices?notion=${nid}`} style={{ marginRight: 8 }}>
            {ref.byId.get(nid)?.title ?? nid}
          </Link>
        ))}
        · {t(`levels.${e.level}`)} · {t("admin.exercises.difficulty", { n: e.difficulty })} ·{" "}
        {t(`exercise.sources.${e.source}`)}
      </p>

      <section className="card stack">
        <h2>{t("admin.detail.statement")}</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{e.statement}</p>
        <h2>{t("admin.detail.expected")}</h2>
        <AnswerPreview answer={e.answer} />
        <h2>{t("admin.detail.hints")}</h2>
        <ol className="hints">
          {e.hints.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ol>
        <h2>{t("admin.detail.explanation")}</h2>
        <p>{e.explanation}</p>
        {mathCheck && <p className="muted small">{t("admin.detail.mathCheck", { status: mathCheck })}</p>}
      </section>

      <ReviewActions id={id} />
      <JsonEditor id={id} initial={JSON.stringify(content, null, 2)} />

      <section className="card stack">
        <h2>{t("admin.detail.reportsTitle")}</h2>
        {reports.length === 0 ? (
          <p className="muted">{t("admin.detail.noReports")}</p>
        ) : (
          <ul className="plain">
            {reports.map((r) => (
              <li key={r._id.toHexString()}>
                <strong>{t(`exercise.reportReasons.${r.reason}`)}</strong> {r.comment && `— ${r.comment}`}{" "}
                <span className="muted small">
                  ({r.reporterType}, {r.createdAt.toLocaleDateString("fr-FR")}){r.resolvedAt ? " ✓" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card stack">
        <h2>{t("admin.detail.reviews")}</h2>
        <ul className="plain">
          {reviews.map((r) => (
            <li key={r._id.toHexString()}>
              <span className="muted small">{r.createdAt.toLocaleString("fr-FR")}</span> · {r.reviewer} ·{" "}
              {r.verdict === "NOTE" ? r.verdict : <StatusBadge status={r.verdict} />}{" "}
              {r.notes && `— ${r.notes}`}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
