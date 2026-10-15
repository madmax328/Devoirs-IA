"use client";

import { PIN_LENGTH } from "@devoirs/shared";
import { t } from "@/lib/i18n";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"] as const;

export function PinPad({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  function press(key: string) {
    if (disabled) return;
    if (key === "⌫") onChange(value.slice(0, -1));
    else if (key && value.length < PIN_LENGTH) onChange(value + key);
  }

  return (
    <div className="stack" style={{ alignItems: "center" }}>
      <div className="pin-dots" aria-label={t("childSpace.enterPin")} role="status">
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={i < value.length ? "pin-dot filled" : "pin-dot"} />
        ))}
      </div>
      <div className="pin-pad">
        {KEYS.map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              className="pin-key"
              onClick={() => press(k)}
              disabled={disabled}
              aria-label={k === "⌫" ? t("common.back") : k}
            >
              {k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
