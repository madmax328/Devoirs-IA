/**
 * Design tokens partagés web + mobile.
 * Univers chaud et coloré, mais pas « petit enfant » : couleurs franches, coins arrondis, peu d'effets.
 * Les paires texte/fond sont vérifiées AA par test/contrast.test.ts.
 */
export const palette = {
  sun50: "#FFF7EB",
  sun100: "#FFE9C7",
  sun400: "#FFB547",
  sun600: "#D97A00",
  coral400: "#FF7A5C",
  coral600: "#C2410C",
  teal400: "#2BB3A3",
  teal600: "#0F766E",
  teal700: "#115E59",
  violet400: "#8B7CF6",
  violet600: "#5B4BD6",
  ink900: "#1C1A27",
  ink800: "#2A2737",
  ink700: "#3A3648",
  ink500: "#6B6680",
  ink300: "#B9B4C8",
  ink100: "#EEEBF4",
  white: "#FFFFFF",
  red600: "#B42318",
  red300: "#FDA29B",
} as const;

export interface ColorScheme {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  success: string;
  danger: string;
  focus: string;
}

export const colors: Record<"light" | "dark", ColorScheme> = {
  light: {
    background: palette.sun50,
    surface: palette.white,
    surfaceAlt: palette.sun100,
    text: palette.ink900,
    textMuted: "#56516A",
    border: "#E4DDD0",
    primary: palette.teal700,
    onPrimary: palette.white,
    accent: palette.violet600,
    onAccent: palette.white,
    success: palette.teal600,
    danger: palette.red600,
    focus: palette.violet600,
  },
  dark: {
    background: palette.ink900,
    surface: palette.ink800,
    surfaceAlt: palette.ink700,
    text: "#F7F5FB",
    textMuted: palette.ink300,
    border: "#454055",
    primary: palette.teal400,
    onPrimary: palette.ink900,
    accent: palette.violet400,
    onAccent: palette.ink900,
    success: palette.teal400,
    danger: palette.red300,
    focus: palette.sun400,
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;

export const fontSize = { sm: 14, md: 16, lg: 18, xl: 22, xxl: 28, display: 36 } as const;
export const lineHeight = { normal: 1.4, relaxed: 1.7 } as const; // "relaxed" = option dys

/** Cible tactile minimale (une main, gros boutons). */
export const minTouchTarget = 52;

export const fonts = {
  /** Police par défaut : celle du système. */
  base: "system",
  /** Option « police adaptée dys » : Luciole (licence CC-BY 4.0) — fichiers à intégrer au jalon 9. */
  dys: "Luciole",
} as const;
