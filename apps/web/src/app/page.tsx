import Link from "next/link";
import { t } from "@/lib/i18n";

export default function HomePage() {
  return (
    <main className="container">
      <section className="hero stack">
        <h1>{t("app.name")}</h1>
        <p className="muted">{t("app.tagline")}</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn" href="/inscription">
            {t("auth.register")}
          </Link>
          <Link className="btn btn-secondary" href="/connexion">
            {t("auth.login")}
          </Link>
        </div>
      </section>
    </main>
  );
}
