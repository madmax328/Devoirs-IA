import { referentiel } from "@devoirs/content";
import { SCHOOL_LEVELS, SUBJECTS, type SchoolLevel, type Subject } from "@devoirs/shared";
import Link from "next/link";
import { GenerateButton } from "@/components/admin/GenerateButton";
import { t } from "@/lib/i18n";
import { bankStats } from "@/server/services/exercises";

type Search = Promise<{ matiere?: string; niveau?: string }>;

export default async function ReferentielPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const subject: Subject = (SUBJECTS as readonly string[]).includes(sp.matiere ?? "")
    ? (sp.matiere as Subject)
    : "MATHS";
  const level: SchoolLevel = (SCHOOL_LEVELS as readonly string[]).includes(sp.niveau ?? "")
    ? (sp.niveau as SchoolLevel)
    : "SIXIEME";
  const ref = referentiel();
  const notions = ref.notions.filter((n) => n.subject === subject && n.level === level);
  const stats = await bankStats();
  const aiReady = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <>
      <h1>{t("admin.referentiel.title")}</h1>
      <div className="filters">
        {SUBJECTS.map((s) => (
          <Link key={s} href={`/admin/referentiel?matiere=${s}&niveau=${level}`} aria-current={s === subject}>
            {t(`subjects.${s}`)}
          </Link>
        ))}
      </div>
      <div className="filters">
        {SCHOOL_LEVELS.map((l) => (
          <Link key={l} href={`/admin/referentiel?matiere=${subject}&niveau=${l}`} aria-current={l === level}>
            {t(`levels.${l}`)}
          </Link>
        ))}
      </div>
      {!aiReady && <p className="alert">{t("admin.dashboard.aiMissing")}</p>}
      {notions.length === 0 && <p className="muted">{t("admin.exercises.empty")}</p>}
      {notions.map((n) => {
        const s = stats.perNotion.get(n.id) ?? {};
        return (
          <section key={n.id} className="card stack" style={{ gap: 8 }}>
            <div className="row spread">
              <div>
                <strong>{n.title}</strong> <span className="muted small">· {n.theme}</span>
                <div className="muted small">{n.id}</div>
              </div>
              <GenerateButton notionId={n.id} disabled={!aiReady} />
            </div>
            <p className="small">{n.description}</p>
            {n.prerequisites.length > 0 && (
              <p className="small">
                <strong>{t("admin.referentiel.prerequisites")} :</strong>{" "}
                {n.prerequisites.map((p) => ref.byId.get(p)?.title ?? p).join(" · ")}
              </p>
            )}
            <p className="small">
              <strong>{t("admin.referentiel.mistakes")} :</strong> {n.commonMistakes.join(" · ")}
            </p>
            <p className="small">
              {t("admin.referentiel.exercisesCount", {
                servable: (s.AUTO_VALIDATED ?? 0) + (s.HUMAN_VALIDATED ?? 0),
                draft: s.DRAFT ?? 0,
              })}{" "}
              · <Link href={`/admin/exercices?notion=${n.id}`}>{t("admin.referentiel.seeExercises")}</Link>
            </p>
          </section>
        );
      })}
    </>
  );
}
