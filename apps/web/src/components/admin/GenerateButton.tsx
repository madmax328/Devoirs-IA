"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { t } from "@/lib/i18n";

interface Outcome {
  created: { id: string }[];
  discarded: { statement: string; reasons: string[] }[];
  generationFailed: boolean;
}

export function GenerateButton({ notionId, disabled }: { notionId: string; disabled?: boolean }) {
  const router = useRouter();
  const [count, setCount] = useState(3);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string; details?: string[] } | null>(null);

  async function run() {
    setPending(true);
    setMessage(null);
    try {
      const res = await api<Outcome>("/api/admin/generate", { method: "POST", body: { notionId, count } });
      if (res.generationFailed) setMessage({ ok: false, text: t("admin.referentiel.generationFailed") });
      else
        setMessage({
          ok: true,
          text: t("admin.referentiel.generated", {
            created: res.created.length,
            discarded: res.discarded.length,
          }),
          details: res.discarded.map((d) => `${d.statement.slice(0, 60)}… → ${d.reasons.join(" ; ")}`),
        });
      router.refresh();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : t("errors.generic") });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row">
        <select
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          disabled={pending}
          aria-label="Nombre"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button className="btn btn-secondary" type="button" onClick={run} disabled={pending || disabled}>
          {t("admin.referentiel.generate")}
        </button>
      </div>
      {pending && <span className="muted small">{t("admin.referentiel.generating")}</span>}
      {message && (
        <div className={message.ok ? "small" : "small error"} role="status">
          {message.text}
          {message.details && message.details.length > 0 && (
            <ul className="plain muted">
              {message.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
