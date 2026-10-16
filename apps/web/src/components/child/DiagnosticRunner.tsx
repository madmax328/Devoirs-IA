"use client";

import type { DiagnosticStep, StudentResponse, Subject } from "@devoirs/shared";
import { translate, DEFAULT_LOCALE, type MessageKey } from "@devoirs/shared/i18n";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { t } from "@/lib/i18n";
import { Coach } from "./Coach";
import { DiagnosticSummaryView } from "./DiagnosticSummaryView";
import { ExercisePlayer } from "./ExercisePlayer";

export function DiagnosticRunner({ subject }: { subject: Subject }) {
  const [step, setStep] = useState<DiagnosticStep | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shownAt = useRef(Date.now());

  useEffect(() => {
    api<DiagnosticStep>("/api/child/diagnostic", { method: "POST", body: { subject } })
      .then((s) => {
        setStep(s);
        shownAt.current = Date.now();
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("errors.generic")));
  }, [subject]);

  const send = useCallback(
    async (body: { response: StudentResponse } | { skipped: true }) => {
      if (!step?.exercise) return;
      setPending(true);
      setError(null);
      try {
        const next = await api<DiagnosticStep>(`/api/child/diagnostic/${step.sessionId}/answer`, {
          method: "POST",
          body: { exerciseId: step.exercise.id, durationMs: Date.now() - shownAt.current, ...body },
        });
        setStep(next);
        setShowFeedback(next.feedback !== null && next.feedback.kind !== "retry");
        if (next.exercise?.id !== step.exercise.id) shownAt.current = Date.now();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("errors.generic"));
      } finally {
        setPending(false);
      }
    },
    [step],
  );

  if (error && !step) {
    return (
      <div className="stack">
        <Coach>
          <p>{error}</p>
        </Coach>
        <Link className="btn" href="/enfant/accueil">
          {t("diagnostic.backHome")}
        </Link>
      </div>
    );
  }
  if (!step) return <p className="muted">{t("common.loading")}</p>;

  const feedbackText = step.feedback
    ? translate(DEFAULT_LOCALE, step.feedback.messageKey as MessageKey)
    : null;

  // Retour sur la réponse précédente, avant de passer à la suite.
  if (showFeedback && step.feedback) {
    return (
      <div className="stack pop">
        <p className={`feedback ${step.feedback.kind}`} role="status">
          {feedbackText}
        </p>
        <button className="btn btn-block" type="button" autoFocus onClick={() => setShowFeedback(false)}>
          {t("diagnostic.continue")}
        </button>
      </div>
    );
  }

  if (!step.exercise) {
    return (
      <div className="stack pop">
        <h1>{t("diagnostic.finishedTitle")}</h1>
        <Coach>
          <p>{t("diagnostic.finishedIntro")}</p>
        </Coach>
        {step.summary && <DiagnosticSummaryView summary={step.summary} />}
        <Link className="btn btn-block" href="/enfant/accueil">
          {t("diagnostic.backHome")}
        </Link>
      </div>
    );
  }

  const pct = Math.round((step.progress.asked / step.progress.max) * 100);
  return (
    <div className="stack">
      <div className="stack" style={{ gap: 6 }}>
        <div className="progress" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <span className="muted small">
          {t("diagnostic.progress", { n: step.progress.asked + 1, max: step.progress.max })}
        </span>
      </div>
      {step.feedback?.kind === "retry" && feedbackText && (
        <p className="feedback retry" role="alert">
          {feedbackText}
        </p>
      )}
      <ExercisePlayer
        key={step.exercise.id}
        exercise={step.exercise}
        disabled={pending}
        onSubmit={(response) => void send({ response })}
        onSkip={() => void send({ skipped: true })}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="muted small" style={{ textAlign: "center" }}>
        {t("diagnostic.canStop")} <Link href="/enfant/accueil">{t("diagnostic.backHome")}</Link>
      </p>
    </div>
  );
}
