import { referentiel } from "@devoirs/content";
import { headers } from "next/headers";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { getParent } from "@/server/guards";
import { dailyBudgetUsd, spentTodayUsd } from "@/server/services/ai";
import { bankStats } from "@/server/services/exercises";

export default async function AdminDashboard() {
  const user = await getParent(await headers());
  const [stats, spent] = await Promise.all([bankStats(), spentTodayUsd()]);
  const budget = dailyBudgetUsd();
  const servable = stats.byStatus.AUTO_VALIDATED + stats.byStatus.HUMAN_VALIDATED;
  const total = Object.values(stats.byStatus).reduce((a, b) => a + b, 0);

  return (
    <>
      <h1>{t("admin.title")}</h1>
      <p className="muted">{t("admin.signedInAs", { email: user?.email ?? "" })}</p>
      {!process.env.ANTHROPIC_API_KEY && <p className="alert">{t("admin.dashboard.aiMissing")}</p>}
      {spent >= budget && <p className="alert">{t("admin.dashboard.budgetExceeded")}</p>}
      <div className="stats">
        <div className="stat">
          <span className="muted">{t("admin.dashboard.bank")}</span>
          <strong>{total}</strong>
        </div>
        <div className="stat">
          <span className="muted">{t("admin.dashboard.servable")}</span>
          <strong>{servable}</strong>
        </div>
        <Link
          className="stat"
          href="/admin/exercices?statut=DRAFT"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <span className="muted">{t("admin.dashboard.toReview")}</span>
          <strong>{stats.byStatus.DRAFT}</strong>
        </Link>
        <Link
          className="stat"
          href="/admin/exercices?signales=1"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <span className="muted">{t("admin.dashboard.openReports")}</span>
          <strong>{stats.openReports}</strong>
        </Link>
        <div className="stat">
          <span className="muted">{t("admin.dashboard.notions")}</span>
          <strong>{referentiel().notions.length}</strong>
        </div>
        <Link className="stat" href="/admin/couts" style={{ textDecoration: "none", color: "inherit" }}>
          <span className="muted">{t("admin.dashboard.aiToday")}</span>
          <strong>{spent.toFixed(2)} $</strong>
          <span className="small muted">{t("admin.dashboard.budget", { budget })}</span>
        </Link>
      </div>
    </>
  );
}
