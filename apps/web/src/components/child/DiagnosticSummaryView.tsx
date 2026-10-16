import type { DiagnosticSummary } from "@devoirs/shared";
import { t } from "@/lib/i18n";

/** On ne montre que les premières notions à travailler (les bases) pour ne pas décourager. */
const SHOWN = 3;

export function DiagnosticSummaryView({ summary }: { summary: DiagnosticSummary }) {
  return (
    <div className="stack">
      <section className="card stack" style={{ gap: 8 }}>
        <h2>{t("diagnostic.masteredTitle")}</h2>
        {summary.mastered.length === 0 ? (
          <p className="muted">{t("diagnostic.nothingMastered")}</p>
        ) : (
          <div className="chips">
            {summary.mastered.map((n) => (
              <span key={n.id} className="chip">
                ✓ {n.title}
              </span>
            ))}
          </div>
        )}
      </section>
      <section className="card stack" style={{ gap: 8 }}>
        <h2>{t("diagnostic.toWorkTitle")}</h2>
        {summary.toWork.length === 0 ? (
          <p className="muted">{t("diagnostic.nothingToWork")}</p>
        ) : (
          <>
            <p className="muted small">{t("diagnostic.toWorkHint")}</p>
            <ol className="hints">
              {summary.toWork.slice(0, SHOWN).map((n) => (
                <li key={n.id}>{n.title}</li>
              ))}
            </ol>
            {summary.toWork.length > SHOWN && (
              <p className="muted small">{t("diagnostic.andMore", { n: summary.toWork.length - SHOWN })}</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
