import { t } from "@/lib/i18n";

/** Numéros d'aide affichés en cas de détresse (textes à valider, voir RESTE-A-FAIRE). */
export function HelpCard() {
  return (
    <section className="help-card stack" aria-labelledby="help-title">
      <h2 id="help-title">{t("safety.distressTitle")}</h2>
      <a className="btn btn-accent" href="tel:3018">
        {t("safety.call3018")}
      </a>
      <p className="small muted" style={{ margin: 0 }}>
        {t("safety.call3018Detail")}
      </p>
      <a className="btn btn-accent" href="tel:119">
        {t("safety.call119")}
      </a>
      <p className="small muted" style={{ margin: 0 }}>
        {t("safety.call119Detail")}
      </p>
      <p className="small">{t("safety.emergency")}</p>
    </section>
  );
}
