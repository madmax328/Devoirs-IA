"use client";

import { PIN_LENGTH, type ChildPublic } from "@devoirs/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { t } from "@/lib/i18n";
import { Avatar } from "./Avatar";
import { PinPad } from "./PinPad";

export function ChildPicker({ childProfiles }: { childProfiles: ChildPublic[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<ChildPublic | null>(
    childProfiles.length === 1 ? (childProfiles[0] ?? null) : null,
  );
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!selected || pin.length !== PIN_LENGTH) return;
    setPending(true);
    api("/api/child-session", { method: "POST", body: { childId: selected.id, pin } })
      .then(() => {
        router.push("/enfant/accueil");
        router.refresh();
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("errors.generic"));
        setPin("");
        setPending(false);
      });
  }, [pin, selected, router]);

  if (!selected) {
    return (
      <div className="stack">
        <h1 style={{ textAlign: "center" }}>{t("childSpace.whoAreYou")}</h1>
        <div className="choices">
          {childProfiles.map((c) => (
            <button key={c.id} type="button" className="choice" onClick={() => setSelected(c)}>
              <Avatar id={c.avatar} large />
              <strong>{c.displayName}</strong>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="stack pop" style={{ alignItems: "center" }}>
      <Avatar id={selected.avatar} large />
      <h1>{t("childSpace.hello", { name: selected.displayName })}</h1>
      <p>{t("childSpace.enterPin")}</p>
      <PinPad
        value={pin}
        onChange={(v) => {
          setError(null);
          setPin(v);
        }}
        disabled={pending}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {childProfiles.length > 1 && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setSelected(null);
            setPin("");
            setError(null);
          }}
        >
          {t("childSpace.switchProfile")}
        </button>
      )}
    </div>
  );
}
