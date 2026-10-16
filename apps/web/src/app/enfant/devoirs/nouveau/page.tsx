import { NewHomework } from "@/components/child/NewHomework";
import { t } from "@/lib/i18n";
import { childOrRedirect } from "@/server/page-guards";

export const dynamic = "force-dynamic";

export default async function NewHomeworkPage() {
  const { child } = await childOrRedirect();
  return (
    <main className={child.settings.dysFont ? "container stack dys" : "container stack"}>
      <h1>{t("homework.newHelp")}</h1>
      <NewHomework />
    </main>
  );
}
