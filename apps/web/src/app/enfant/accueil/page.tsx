import { Avatar } from "@/components/Avatar";
import { ChildLogoutButton } from "@/components/ChildLogoutButton";
import { t } from "@/lib/i18n";
import { childOrRedirect } from "@/server/page-guards";

export const dynamic = "force-dynamic";

export default async function ChildHomePage() {
  const { child } = await childOrRedirect();
  return (
    <main
      className={child.settings.dysFont ? "container stack dys" : "container stack"}
      style={{ alignItems: "center", textAlign: "center" }}
    >
      <Avatar id={child.avatar} large />
      <h1>{t("childSpace.hello", { name: child.displayName })}</h1>
      <div className="card">
        <p>{t("childSpace.comingSoon")}</p>
      </div>
      <ChildLogoutButton />
    </main>
  );
}
