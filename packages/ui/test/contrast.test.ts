import { describe, expect, it } from "vitest";
import { colors, contrastRatio } from "../src";

const AA = 4.5;

describe.each(["light", "dark"] as const)("thème %s : contrastes AA", (scheme) => {
  const c = colors[scheme];
  const pairs: [string, string, string][] = [
    ["texte / fond", c.text, c.background],
    ["texte / surface", c.text, c.surface],
    ["texte secondaire / fond", c.textMuted, c.background],
    ["texte secondaire / surface", c.textMuted, c.surface],
    ["bouton principal", c.onPrimary, c.primary],
    ["bouton accent", c.onAccent, c.accent],
    ["erreur / surface", c.danger, c.surface],
    ["principal / fond", c.primary, c.background],
  ];
  it.each(pairs)("%s", (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA);
  });
});
