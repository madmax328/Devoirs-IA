"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { t } from "@/lib/i18n";

/** Prévient le parent d'un moment difficile, sans jamais montrer le contenu de l'échange. */
export function SafetyBanner({ id, childName }: { id: string; childName: string }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div
      className="alert stack"
      role="status"
      style={{ gap: 8, color: "var(--c-text)", borderColor: "var(--c-accent)" }}
    >
      <p style={{ margin: 0 }}>{t("safety.parentBanner", { name: childName })}</p>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={async () => {
          setHidden(true);
          await api(`/api/parent/notifications/${id}/read`, { method: "POST", body: {} }).catch(
            () => undefined,
          );
          router.refresh();
        }}
      >
        {t("safety.parentBannerDismiss")}
      </button>
    </div>
  );
}
