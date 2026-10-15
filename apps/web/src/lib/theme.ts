import { colors, fontSize, lineHeight, minTouchTarget, radius, spacing, type ColorScheme } from "@devoirs/ui";

function vars(scheme: ColorScheme): string {
  return Object.entries(scheme)
    .map(([k, v]) => `--c-${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${v};`)
    .join(" ");
}

/** Variables CSS générées depuis les design tokens partagés (thème clair + sombre). */
export const themeCss = `
:root { ${vars(colors.light)}
  --radius-sm: ${radius.sm}px; --radius-md: ${radius.md}px; --radius-lg: ${radius.lg}px;
  --space-sm: ${spacing.sm}px; --space-md: ${spacing.md}px; --space-lg: ${spacing.lg}px; --space-xl: ${spacing.xl}px; --space-xxl: ${spacing.xxl}px;
  --fs-sm: ${fontSize.sm}px; --fs-md: ${fontSize.md}px; --fs-lg: ${fontSize.lg}px; --fs-xl: ${fontSize.xl}px; --fs-xxl: ${fontSize.xxl}px; --fs-display: ${fontSize.display}px;
  --lh: ${lineHeight.normal}; --lh-relaxed: ${lineHeight.relaxed};
  --touch: ${minTouchTarget}px;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) { :root { ${vars(colors.dark)} } }
`;
