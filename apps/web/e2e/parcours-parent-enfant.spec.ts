import { expect, test } from "@playwright/test";

test("un parent s'inscrit, crée un profil enfant, puis l'enfant ouvre son espace avec son code", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@exemple.fr`;

  await page.goto("/");
  await page.getByRole("link", { name: "Créer mon compte" }).click();
  await page.getByLabel("Votre prénom").fill("Camille");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.getByLabel(/J'accepte les conditions/).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(page.getByRole("heading", { name: "Mes enfants" })).toBeVisible();
  await page.getByRole("link", { name: "Ajouter un enfant" }).click();

  await page.getByLabel("Prénom ou pseudo").fill("Léa");
  await page.getByRole("button", { name: "5e" }).click();
  await page.getByLabel("Code secret (4 chiffres)").fill("2468");

  // Sans consentement : refus avec un message clair.
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("Votre accord est nécessaire");

  await page.getByLabel("Je donne mon accord").check();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Léa")).toBeVisible();

  await page.getByRole("link", { name: "Ouvrir l'espace enfant" }).click();
  await expect(page.getByRole("heading", { name: "Salut Léa !" })).toBeVisible();

  // Mauvais code, puis bon code.
  for (const d of "1111") await page.getByRole("button", { name: d, exact: true }).click();
  await expect(page.locator("p[role=alert]")).toContainText("Ce n'est pas le bon code");
  for (const d of "2468") await page.getByRole("button", { name: d, exact: true }).click();

  await expect(page).toHaveURL(/\/enfant\/accueil/);
  await expect(page.getByText("Ton coach arrive très bientôt")).toBeVisible();
  await page.screenshot({ path: "e2e/__screens__/accueil-enfant.png" });
});
