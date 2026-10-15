"use client";

import {
  AVATARS,
  CHILD_LEVELS,
  SUBJECTS,
  createChildSchema,
  defaultChildSettings,
  updateChildSchema,
  type Avatar as AvatarId,
  type ChildLevel,
  type ChildPublic,
  type Subject,
} from "@devoirs/shared";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { t, tError } from "@/lib/i18n";
import { avatarEmoji } from "./Avatar";

export function ChildForm({ child }: { child?: ChildPublic }) {
  const router = useRouter();
  const editing = child !== undefined;
  const initial = child?.settings ?? defaultChildSettings();

  const [displayName, setDisplayName] = useState(child?.displayName ?? "");
  const [level, setLevel] = useState<ChildLevel>(child?.level ?? "SIXIEME");
  const [avatar, setAvatar] = useState<AvatarId>(child?.avatar ?? "renard");
  const [subjects, setSubjects] = useState<Subject[]>(initial.subjects);
  const [curfew, setCurfew] = useState(initial.curfew);
  const [dysFont, setDysFont] = useState(initial.dysFont);
  const [pin, setPin] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const toggleSubject = (s: Subject) =>
    setSubjects((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const settings = { subjects, curfew, dysFont };
    const parsed = editing
      ? updateChildSchema.safeParse({ displayName, level, avatar, settings, ...(pin ? { pin } : {}) })
      : createChildSchema.safeParse({ displayName, level, avatar, pin, settings, parentalConsent: consent });
    if (!parsed.success) {
      setError(tError(parsed.error.issues[0]?.message ?? "errors.generic"));
      return;
    }
    setPending(true);
    try {
      if (editing) await api(`/api/children/${child.id}`, { method: "PATCH", body: parsed.data });
      else await api("/api/children", { method: "POST", body: parsed.data });
      router.push("/parent");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
      setPending(false);
    }
  }

  async function onDelete() {
    if (!editing || !window.confirm(t("child.deleteConfirm", { name: child.displayName }))) return;
    setPending(true);
    try {
      await api(`/api/children/${child.id}`, { method: "DELETE" });
      router.push("/parent");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
      setPending(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit} noValidate>
      <h1>{editing ? t("child.editTitle") : t("child.formTitle")}</h1>

      <div className="card stack">
        <div className="field">
          <label htmlFor="displayName">{t("child.displayName")}</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={20}
          />
          <span className="hint">{t("child.displayNameHint")}</span>
        </div>

        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 8 }}>{t("child.level")}</legend>
          <div className="choices">
            {CHILD_LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                className="choice"
                aria-pressed={level === l}
                onClick={() => setLevel(l)}
              >
                {t(`levels.${l}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 8 }}>{t("child.avatar")}</legend>
          <div className="choices">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                className="choice"
                aria-pressed={avatar === a}
                onClick={() => setAvatar(a)}
              >
                <span style={{ fontSize: 30 }} aria-hidden="true">
                  {avatarEmoji(a)}
                </span>
                <span className="small">{t(`avatars.${a}`)}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 8 }}>{t("child.subjects")}</legend>
          <div className="choices">
            {SUBJECTS.map((s) => (
              <button
                key={s}
                type="button"
                className="choice"
                aria-pressed={subjects.includes(s)}
                onClick={() => toggleSubject(s)}
              >
                {t(`subjects.${s}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="curfew">{t("child.curfew")}</label>
          <input id="curfew" type="time" value={curfew} onChange={(e) => setCurfew(e.target.value)} />
          <span className="hint">{t("child.curfewHint")}</span>
        </div>

        <label className="check">
          <input type="checkbox" checked={dysFont} onChange={(e) => setDysFont(e.target.checked)} />
          <span>{t("child.dysFont")}</span>
        </label>

        <div className="field">
          <label htmlFor="pin">{t("child.pin")}</label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder={editing ? "••••" : ""}
          />
          <span className="hint">{t("child.pinHint")}</span>
        </div>
      </div>

      {!editing && (
        <div className="card stack">
          <h2>{t("child.consentTitle")}</h2>
          <p className="consent">{t("child.consentText")}</p>
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>{t("child.consentCheckbox")}</span>
          </label>
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button className="btn btn-block" type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("common.save")}
      </button>
      {editing && (
        <button className="btn btn-danger btn-block" type="button" onClick={onDelete} disabled={pending}>
          {t("common.delete")}
        </button>
      )}
    </form>
  );
}
