import { SUBJECTS, type Subject } from "@devoirs/shared";
import { notFound } from "next/navigation";
import { DiagnosticRunner } from "@/components/child/DiagnosticRunner";
import { t } from "@/lib/i18n";
import { childOrRedirect } from "@/server/page-guards";

export const dynamic = "force-dynamic";

export default async function DiagnosticPage({ params }: { params: Promise<{ subject: string }> }) {
  const { child } = await childOrRedirect();
  const { subject } = await params;
  if (!(SUBJECTS as readonly string[]).includes(subject)) notFound();
  return (
    <main className={child.settings.dysFont ? "container stack dys" : "container stack"}>
      <p className="muted small">
        {t("diagnostic.title")} · {t(`subjects.${subject as Subject}`)}
      </p>
      <DiagnosticRunner subject={subject as Subject} />
    </main>
  );
}
