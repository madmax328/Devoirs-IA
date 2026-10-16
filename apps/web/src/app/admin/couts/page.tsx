import { t } from "@/lib/i18n";
import { costsByDay, dailyBudgetUsd } from "@/server/services/ai";

export default async function CostsPage() {
  const rows = await costsByDay(14);
  const total = rows.reduce((a, r) => a + r.costUsd, 0);
  const budget = dailyBudgetUsd();
  const perDay = new Map<string, number>();
  for (const r of rows) perDay.set(r.day, (perDay.get(r.day) ?? 0) + r.costUsd);

  return (
    <>
      <h1>{t("admin.costs.title")}</h1>
      <p className="muted">{t("admin.dashboard.budget", { budget })}</p>
      {rows.length === 0 ? (
        <p className="muted">{t("admin.costs.empty")}</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("admin.costs.day")}</th>
                <th>{t("admin.costs.feature")}</th>
                <th>{t("admin.costs.calls")}</th>
                <th>{t("admin.costs.failures")}</th>
                <th>{t("admin.costs.tokens")}</th>
                <th>{t("admin.costs.cost")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.day}-${r.feature}`}
                  style={(perDay.get(r.day) ?? 0) >= budget ? { color: "var(--c-danger)" } : undefined}
                >
                  <td>{r.day}</td>
                  <td>{r.feature}</td>
                  <td>{r.calls}</td>
                  <td>{r.failures}</td>
                  <td>
                    {r.inputTokens.toLocaleString("fr-FR")} / {r.outputTokens.toLocaleString("fr-FR")}
                  </td>
                  <td>{r.costUsd.toFixed(4)}</td>
                </tr>
              ))}
              <tr>
                <th colSpan={5}>{t("admin.costs.total")}</th>
                <th>{total.toFixed(4)}</th>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
