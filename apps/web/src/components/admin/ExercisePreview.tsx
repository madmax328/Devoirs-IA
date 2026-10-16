import type { AnswerData } from "@devoirs/shared";
import { t } from "@/lib/i18n";

/** Affiche une réponse attendue de façon lisible pour la relecture. */
export function AnswerPreview({ answer }: { answer: AnswerData }) {
  switch (answer.type) {
    case "MCQ":
      return (
        <ul className="plain">
          {answer.choices.map((c, i) => (
            <li key={i}>
              {answer.correct.includes(i) ? <strong>✓ {c}</strong> : c}
              {answer.correct.includes(i) && (
                <span className="muted small"> ({t("admin.detail.correctChoice")})</span>
              )}
            </li>
          ))}
        </ul>
      );
    case "NUMERIC":
      return (
        <p>
          <strong>{answer.value}</strong> <span className="muted small">· {answer.format}</span>
          {answer.tolerance > 0 && (
            <span className="muted small"> · {t("admin.detail.tolerance", { t: answer.tolerance })}</span>
          )}
          {answer.unit && (
            <span className="muted small"> · {t("admin.detail.unit", { u: answer.unit })}</span>
          )}
        </p>
      );
    case "FILL_BLANKS":
      return (
        <div>
          <p>{answer.text}</p>
          <ul className="plain">
            {answer.blanks.map((b) => (
              <li key={b.id}>
                {t("admin.detail.blank", { id: b.id })} —{" "}
                {t("admin.detail.accepted", { values: b.accepted.join(" / ") })}{" "}
                {b.accentSensitive && (
                  <span className="muted small">{t("admin.detail.accentSensitive")}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    case "MATCHING":
      return (
        <ul className="plain">
          {answer.pairs.map(([l, r]) => (
            <li key={l}>
              {answer.left[l]} ↔ {answer.right[r]}
            </li>
          ))}
        </ul>
      );
    case "ORDERING":
      return (
        <ol className="hints">
          {answer.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ol>
      );
    case "TRUE_FALSE":
      return (
        <p>
          {t("admin.detail.trueFalse", { value: answer.correct ? "VRAI" : "FAUX" })}
          {answer.expectedJustification && (
            <>
              <br />
              <span className="muted small">
                {t("admin.detail.justification", { text: answer.expectedJustification })}
              </span>
            </>
          )}
        </p>
      );
    case "SHORT_TEXT":
      return (
        <p>
          {t("admin.detail.modelAnswer", { text: answer.modelAnswer })}
          <br />
          <span className="muted small">
            {t("admin.detail.criteria", { list: answer.criteria.join(" ; ") })}
          </span>
        </p>
      );
  }
}

export function StatusBadge({
  status,
}: {
  status: "DRAFT" | "AUTO_VALIDATED" | "HUMAN_VALIDATED" | "REJECTED";
}) {
  return <span className={`badge badge-${status}`}>{t(`exercise.statuses.${status}`)}</span>;
}
