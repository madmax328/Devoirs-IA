"use client";

import {
  draftToResponse,
  emptyDraft,
  isDraftComplete,
  setPair,
  toggleChoice,
  toggleOrderItem,
  type Draft,
  type PublicExercise,
  type StudentResponse,
} from "@devoirs/shared";
import { useState } from "react";
import { t } from "@/lib/i18n";

type Props = {
  exercise: PublicExercise;
  disabled?: boolean;
  onSubmit: (response: StudentResponse) => void;
  onSkip?: () => void;
};

/** Affiche un exercice et recueille la réponse de l'élève (sans jamais connaître la bonne réponse). */
export function ExercisePlayer({ exercise, disabled, onSubmit, onSkip }: Props) {
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(exercise));
  const [activeLeft, setActiveLeft] = useState<number | null>(null);
  const p = exercise.payload;
  const complete = isDraftComplete(exercise, draft);

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (complete && !disabled) onSubmit(draftToResponse(draft));
      }}
    >
      {p.type !== "FILL_BLANKS" && <p className="statement">{exercise.statement}</p>}

      {p.type === "MCQ" && draft.type === "MCQ" && (
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="muted small">
            {p.multiple ? t("exercisePlayer.chooseMany") : t("exercisePlayer.chooseOne")}
          </legend>
          <div className="stack" style={{ gap: 8, marginTop: 8 }}>
            {p.choices.map((c, i) => (
              <button
                key={i}
                type="button"
                className="choice"
                style={{ alignItems: "flex-start" }}
                aria-pressed={draft.selected.includes(i)}
                onClick={() => setDraft(toggleChoice(draft, i, p.multiple))}
                disabled={disabled}
              >
                {c}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {p.type === "NUMERIC" && draft.type === "NUMERIC" && (
        <div className="field">
          <label htmlFor="num">
            {t("exercisePlayer.yourAnswer")}{" "}
            {p.unit && <span className="muted">({t("exercisePlayer.unit", { unit: p.unit })})</span>}
          </label>
          <input
            id="num"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={t("exercisePlayer.numberPlaceholder")}
            value={draft.value}
            onChange={(e) => setDraft({ ...draft, value: e.target.value })}
            disabled={disabled}
            style={{ fontSize: 22 }}
          />
          {p.format === "fraction_simplified" && (
            <span className="hint">{t("exercisePlayer.expectFraction")}</span>
          )}
          {p.format === "integer" && <span className="hint">{t("exercisePlayer.expectInteger")}</span>}
          {p.format === "decimal" && <span className="hint">{t("exercisePlayer.expectDecimal")}</span>}
        </div>
      )}

      {p.type === "FILL_BLANKS" && draft.type === "FILL_BLANKS" && (
        <>
          <p className="statement">{exercise.statement}</p>
          <p className="text-flow">
            {p.segments.map((s, i) =>
              "text" in s ? (
                <span key={i}>{s.text}</span>
              ) : (
                <input
                  key={i}
                  type="text"
                  className="blank-input"
                  aria-label={t("exercisePlayer.blankLabel", { n: s.blankId })}
                  autoCapitalize="off"
                  autoComplete="off"
                  spellCheck={false}
                  value={draft.values[s.blankId] ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, values: { ...draft.values, [s.blankId]: e.target.value } })
                  }
                  disabled={disabled}
                />
              ),
            )}
          </p>
        </>
      )}

      {p.type === "MATCHING" && draft.type === "MATCHING" && (
        <>
          <p className="muted small">{t("exercisePlayer.matchingHelp")}</p>
          <div className="match-grid">
            <div className="match-col">
              {p.left.map((l, li) => {
                const pairedRight = p.right.find((r) => r.index === draft.pairs[li]);
                return (
                  <button
                    key={li}
                    type="button"
                    className="choice"
                    data-active={activeLeft === li}
                    aria-pressed={pairedRight !== undefined}
                    onClick={() => setActiveLeft(li)}
                    disabled={disabled}
                  >
                    {l}
                    {pairedRight && <span className="tag">→ {pairedRight.label}</span>}
                  </button>
                );
              })}
            </div>
            <div className="match-col">
              {p.right.map((r) => {
                const used = Object.values(draft.pairs).includes(r.index);
                return (
                  <button
                    key={r.index}
                    type="button"
                    className="choice"
                    aria-pressed={used}
                    disabled={disabled || activeLeft === null}
                    onClick={() => {
                      if (activeLeft === null) return;
                      setDraft(setPair(draft, activeLeft, r.index));
                      setActiveLeft(null);
                    }}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {p.type === "ORDERING" && draft.type === "ORDERING" && (
        <>
          <p className="muted small">{t("exercisePlayer.orderingHelp")}</p>
          <div className="stack" style={{ gap: 8 }}>
            {p.items.map((item) => {
              const pos = draft.order.indexOf(item);
              return (
                <button
                  key={item}
                  type="button"
                  className="choice"
                  aria-pressed={pos >= 0}
                  onClick={() => setDraft(toggleOrderItem(draft, item))}
                  disabled={disabled}
                  style={{ flexDirection: "row", justifyContent: "space-between" }}
                >
                  <span>{item}</span>
                  <strong>{pos >= 0 ? pos + 1 : ""}</strong>
                </button>
              );
            })}
          </div>
          {draft.order.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDraft({ ...draft, order: [] })}
              disabled={disabled}
            >
              {t("exercisePlayer.orderingReset")}
            </button>
          )}
        </>
      )}

      {p.type === "TRUE_FALSE" && draft.type === "TRUE_FALSE" && (
        <div className="row">
          {([true, false] as const).map((v) => (
            <button
              key={String(v)}
              type="button"
              className="choice"
              style={{ flex: 1 }}
              aria-pressed={draft.value === v}
              onClick={() => setDraft({ ...draft, value: v })}
              disabled={disabled}
            >
              {v ? t("exercisePlayer.true") : t("exercisePlayer.false")}
            </button>
          ))}
        </div>
      )}

      {p.type === "SHORT_TEXT" && draft.type === "SHORT_TEXT" && (
        <textarea
          className="json"
          style={{ minHeight: 120, fontFamily: "inherit", fontSize: "var(--fs-lg)" }}
          aria-label={t("exercisePlayer.yourAnswer")}
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          disabled={disabled}
        />
      )}

      <button className="btn btn-block" type="submit" disabled={!complete || disabled}>
        {t("diagnostic.validate")}
      </button>
      {onSkip && (
        <button className="btn btn-secondary btn-block" type="button" onClick={onSkip} disabled={disabled}>
          {t("diagnostic.dontKnow")}
        </button>
      )}
    </form>
  );
}
