import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { t } from "@/lib/i18n";
import { parentOrRedirect } from "@/server/page-guards";

export default async function ParentLayout({ children }: { children: ReactNode }) {
  await parentOrRedirect();
  return (
    <>
      <header className="topbar">
        <Link href="/parent" className="brand">
          {t("app.name")}
        </Link>
        <LogoutButton />
      </header>
      <main className="container">{children}</main>
    </>
  );
}
