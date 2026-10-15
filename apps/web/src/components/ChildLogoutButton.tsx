"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { t } from "@/lib/i18n";

export function ChildLogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={async () => {
        await api("/api/child-session", { method: "DELETE" }).catch(() => undefined);
        router.push("/enfant");
        router.refresh();
      }}
    >
      {t("childSpace.switchProfile")}
    </button>
  );
}
