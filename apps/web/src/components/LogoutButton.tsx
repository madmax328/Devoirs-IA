"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { t } from "@/lib/i18n";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn btn-secondary"
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      {t("auth.logout")}
    </button>
  );
}
