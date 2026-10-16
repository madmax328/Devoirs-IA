// Régénère src/files.generated.ts à partir des fichiers JSON du référentiel et des exercices.
// Usage : pnpm --filter @devoirs/content generate
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const lines = [
  "// Fichier généré par scripts/generate-index.mjs : ne pas modifier à la main.",
  'import type { ReferentielFile } from "@devoirs/shared";',
  "",
];
const refNames = [];
for (const folder of readdirSync(join(root, "referentiel")).sort()) {
  for (const f of readdirSync(join(root, "referentiel", folder)).sort()) {
    if (!f.endsWith(".json")) continue;
    const name = `r_${folder}_${f.replace(".json", "")}`.replace(/-/g, "_");
    lines.push(`import ${name} from "../referentiel/${folder}/${f}";`);
    refNames.push(name);
  }
}
const exNames = [];
for (const f of readdirSync(join(root, "exercices")).sort()) {
  if (!f.endsWith(".json")) continue;
  const name = `e_${f.replace(".json", "")}`.replace(/-/g, "_");
  lines.push(`import ${name} from "../exercices/${f}";`);
  exNames.push(name);
}
lines.push("", `export const RAW_REFERENTIEL_FILES: unknown[] = [${refNames.join(", ")}];`);
lines.push(`export const RAW_EXERCISE_FILES: unknown[] = [${exNames.join(", ")}];`);
lines.push("export type { ReferentielFile };");
writeFileSync(join(root, "src", "files.generated.ts"), lines.join("\n") + "\n");
console.log(`${refNames.length} fichiers de référentiel, ${exNames.length} fichiers d'exercices.`);
