"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { t } from "@/lib/i18n";

/** Correction directe du contenu : le JSON est revalidé côté serveur (schéma + vérifications automatiques). */
export function JsonEditor({ id, initial }: { id: string; initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    setMessage(null);
    let content: unknown;
    try {
      content = JSON.parse(value);
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "JSON" });
      return;
    }
    setPending(true);
    try {
      await api(`/api/admin/exercises/${id}`, { method: "PATCH", body: { content } });
      setMessage({ ok: true, text: t("admin.detail.saved") });
      router.refresh();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : t("errors.generic") });
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="card">
      <summary>{t("admin.detail.editJson")}</summary>
      <div className="stack" style={{ marginTop: 12 }}>
        <textarea
          className="json"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          spellCheck={false}
        />
        <button className="btn" type="button" onClick={save} disabled={pending}>
          {t("admin.detail.saveJson")}
        </button>
        {message && (
          <p className={message.ok ? "muted" : "error"} role="alert">
            {message.text}
          </p>
        )}
      </div>
    </details>
  );
}
