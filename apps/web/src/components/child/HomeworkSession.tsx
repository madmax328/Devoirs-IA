"use client";

import type { HomeworkView } from "@devoirs/shared";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { t } from "@/lib/i18n";
import { Coach } from "./Coach";
import { HelpCard } from "./HelpCard";

export function HomeworkSession({ initial }: { initial: HomeworkView }) {
  const [hw, setHw] = useState(initial);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [statement, setStatement] = useState(initial.analysis?.statement ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Défilement instantané vers le dernier message (pas d'animation : plus sobre et plus robuste).
  useEffect(() => {
    const el = endRef.current;
    if (el) window.scrollTo({ top: el.offsetTop, behavior: "auto" });
  }, [hw.messages.length, pending]);

  async function call(path: string, body: object) {
    setPending(true);
    setError(null);
    try {
      setHw(await api<HomeworkView>(path, { method: "POST", body }));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.generic"));
      return false;
    } finally {
      setPending(false);
    }
  }

  const a = hw.analysis;

  if (hw.status === "UNREADABLE" || hw.status === "OUT_OF_SCOPE") {
    return (
      <div className="stack">
        <h1>{hw.status === "UNREADABLE" ? t("homework.unreadableTitle") : t("homework.outOfScopeTitle")}</h1>
        <Coach>
          <p>
            {hw.status === "UNREADABLE"
              ? (a?.unreadableReason ?? t("homework.analysisFailed"))
              : t("homework.outOfScopeMessage")}
          </p>
          <p className="small muted">{t("homework.photoTip")}</p>
        </Coach>
        <Link className="btn btn-block" href="/enfant/devoirs/nouveau">
          {t("homework.retakePhoto")}
        </Link>
      </div>
    );
  }

  if (hw.status === "TO_CONFIRM" && a) {
    return (
      <div className="stack">
        <h1>{t("homework.confirmTitle")}</h1>
        <p className="muted small">
          {t("homework.detected", {
            subject: a.subject ? t(`subjects.${a.subject}`) : "?",
            level: a.level ? t(`levels.${a.level}`) : "?",
            kind: a.exerciseKind,
          })}
        </p>
        {a.outOfScope === "above_level" && (
          <Coach>
            <p>{t("homework.aboveLevel")}</p>
          </Coach>
        )}
        {editing ? (
          <textarea
            className="json"
            style={{ minHeight: 160, fontFamily: "inherit", fontSize: "var(--fs-md)" }}
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            aria-label={t("homework.confirmTitle")}
          />
        ) : (
          <div className="card">
            <p className="statement" style={{ margin: 0 }}>
              {a.statement}
            </p>
          </div>
        )}
        {pending ? (
          <p className="thinking">{t("homework.coachThinking")}</p>
        ) : editing ? (
          <button
            className="btn btn-block"
            type="button"
            onClick={() =>
              void call(`/api/child/homework/${hw.id}/confirm`, { correctedStatement: statement })
            }
            disabled={statement.trim().length < 5}
          >
            {t("homework.confirmSaveEdit")}
          </button>
        ) : (
          <>
            <button
              className="btn btn-block"
              type="button"
              onClick={() => void call(`/api/child/homework/${hw.id}/confirm`, { correctedStatement: null })}
            >
              {t("homework.confirmYes")}
            </button>
            <button className="btn btn-secondary btn-block" type="button" onClick={() => setEditing(true)}>
              {t("homework.confirmEdit")}
            </button>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  const active = hw.status === "IN_PROGRESS";
  return (
    <div className="stack">
      {a && (
        <details className="card">
          <summary className="small">
            {a.subject ? t(`subjects.${a.subject}`) : ""} · {a.exerciseKind}
          </summary>
          <p className="statement" style={{ marginBottom: 0 }}>
            {a.statement}
          </p>
        </details>
      )}

      <div className="chat" role="log" aria-label={t("homework.coach")}>
        {hw.messages.map((m) => (
          <div key={m.id} className={`msg ${m.role === "coach" ? "msg-coach" : "msg-child"}`}>
            <span className="msg-meta">
              {m.role === "coach" ? t("homework.coach") : t("homework.you")}
              {m.hintLevel ? ` · ${t("homework.hintUsed", { level: m.hintLevel })}` : ""}
            </span>
            {m.role === "child" && m.action === "hint" && !m.text
              ? `💡 ${t("homework.hint")}`
              : m.role === "child" && m.action === "stuck"
                ? `🆘 ${t("homework.stuck")}`
                : m.text}
          </div>
        ))}
        {pending && <p className="thinking">{t("homework.coachThinking")}</p>}
        <div ref={endRef} />
      </div>

      {hw.status === "SAFETY_STOP" && <HelpCard />}

      {hw.status === "COMPLETED" && hw.recap && (
        <section className="card stack" style={{ gap: 8 }}>
          <h2>{t("homework.finishedTitle")}</h2>
          {hw.recap.learned.length > 0 && (
            <>
              <strong>{t("homework.learnedTitle")}</strong>
              <ul className="plain">
                {hw.recap.learned.map((l, i) => (
                  <li key={i}>✓ {l}</li>
                ))}
              </ul>
            </>
          )}
          {hw.recap.notionsToWork.length > 0 && (
            <>
              <strong>{t("homework.toWorkTitle")}</strong>
              <div className="chips">
                {hw.recap.notionsToWork.map((n) => (
                  <span key={n.id} className="chip">
                    {n.title}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {active && (
        <form
          className="stack"
          style={{ gap: 8 }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!text.trim()) return;
            if (await call(`/api/child/homework/${hw.id}/messages`, { action: "message", text })) setText("");
          }}
        >
          <label htmlFor="msg" className="sr-only" style={{ position: "absolute", left: -9999 }}>
            {t("homework.yourMessage")}
          </label>
          <textarea
            id="msg"
            className="json"
            style={{ minHeight: 70, fontFamily: "inherit", fontSize: "var(--fs-md)" }}
            placeholder={t("homework.messagePlaceholder")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            disabled={pending}
          />
          <button className="btn btn-block" type="submit" disabled={pending || !text.trim()}>
            {t("homework.sendMessage")}
          </button>
          <div className="row">
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              disabled={pending}
              onClick={() => void call(`/api/child/homework/${hw.id}/messages`, { action: "hint", text: "" })}
            >
              💡 {t("homework.hint")}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              disabled={pending}
              onClick={() =>
                void call(`/api/child/homework/${hw.id}/messages`, { action: "stuck", text: "" })
              }
            >
              🆘 {t("homework.stuck")}
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <Link className="btn btn-secondary btn-block" href="/enfant/devoirs">
        {t("homework.backToList")}
      </Link>
    </div>
  );
}
