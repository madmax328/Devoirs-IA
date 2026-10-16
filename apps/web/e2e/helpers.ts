import { expect, type Page } from "@playwright/test";

/** Inscrit un parent, crée un enfant (6e, code 2468) et ouvre son espace. */
export async function parentWithChildSpace(page: Page, childName = "Léa"): Promise<void> {
  await page.goto("/inscription");
  await page.getByLabel("Votre prénom").fill("Camille");
  await page
    .getByLabel("Adresse e-mail")
    .fill(`e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@exemple.fr`);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByLabel(/J'accepte les conditions/).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("heading", { name: "Mes enfants" })).toBeVisible();
  await page.goto("/parent/enfants/nouveau");
  await page.getByLabel("Prénom ou pseudo").fill(childName);
  await page.getByLabel("Code secret (4 chiffres)").fill("2468");
  await page.getByLabel("Je donne mon accord").check();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText(childName)).toBeVisible();
  await page.goto("/enfant");
  for (const d of "2468") await page.getByRole("button", { name: d, exact: true }).click();
  await expect(page).toHaveURL(/\/enfant\/accueil/);
}
