"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { t } from "@/lib/i18n";

export function ReviewActions({ id }: { id: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(verdict: "HUMAN_VALIDATED" | "REJECTED" | "DRAFT") {
    setPending(true);
    setError(null);
    try {
      await api(`/api/admin/exercises/${id}/review`, {
        method: "POST",
        body: { verdict, notes: notes || undefined },
      });
      setNotes("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card stack">
      <div className="field">
        <label htmlFor="notes">{t("admin.detail.notes")}</label>
        <input
          id="notes"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
        />
      </div>
      <div className="row">
        <button className="btn" type="button" disabled={pending} onClick={() => decide("HUMAN_VALIDATED")}>
          {t("admin.detail.validate")}
        </button>
        <button
          className="btn btn-danger"
          type="button"
          disabled={pending}
          onClick={() => decide("REJECTED")}
        >
          {t("admin.detail.reject")}
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          disabled={pending}
          onClick={() => decide("DRAFT")}
        >
          {t("admin.detail.backToDraft")}
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
