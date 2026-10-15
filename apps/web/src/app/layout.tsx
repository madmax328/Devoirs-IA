import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import { themeCss } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: t("app.name"),
  description: t("app.tagline"),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF7EB" },
    { media: "(prefers-color-scheme: dark)", color: "#1C1A27" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
