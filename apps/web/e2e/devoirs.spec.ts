import { expect, test, type Locator, type Page } from "@playwright/test";
import { parentWithChildSpace } from "./helpers";

/** Clique et vérifie la réponse de l'API des messages (en cas d'échec, le corps de la réponse apparaît dans le rapport). */
async function clickAndExpectMessageOk(page: Page, target: Locator): Promise<void> {
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/messages") && r.request().method() === "POST"),
    target.click(),
  ]);
  expect(res.status(), await res.text()).toBe(200);
}

test("aide aux devoirs : énoncé tapé, confirmation, indice, erreur, bonne réponse, récapitulatif", async ({
  page,
}) => {
  await parentWithChildSpace(page);
  await page.getByRole("link", { name: /Aide aux devoirs/ }).click();
  await expect(page).toHaveURL(/\/enfant\/devoirs$/);
  await page.getByRole("link", { name: /Aide aux devoirs/ }).click();
  await expect(page).toHaveURL(/\/enfant\/devoirs\/nouveau$/);
  await page
    .getByLabel("Ou tape ton exercice")
    .fill("Dans une classe de 28 élèves, les 3/4 mangent à la cantine. Combien ?");
  await page.getByRole("button", { name: "Envoyer à mon coach" }).click();

  await expect(page.getByRole("heading", { name: "C'est bien ça ton exercice ?" })).toBeVisible();
  await page.screenshot({ path: "e2e/__screens__/devoirs-confirmation.png" });
  await page.getByRole("button", { name: "Oui, c'est parti !" }).click();
  await expect(page.getByText("qu'est-ce qu'on cherche dans cet exercice ?")).toBeVisible();

  await clickAndExpectMessageOk(page, page.getByRole("button", { name: /Un indice/ }));
  await expect(page.getByText(/Petit indice/)).toBeVisible();

  await page.getByPlaceholder("Écris ta réponse ou ta question…").fill("je divise par 3 ?");
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(page.getByText(/Pas encore tout à fait/)).toBeVisible();
  await page.screenshot({ path: "e2e/__screens__/devoirs-conversation.png", fullPage: true });

  await page.getByPlaceholder("Écris ta réponse ou ta question…").fill("28 divisé par 4 = 7, fois 3 = 21");
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Exercice terminé, bravo !" })).toBeVisible();
  await expect(page.getByText("Ce que tu as appris")).toBeVisible();
  await page.screenshot({ path: "e2e/__screens__/devoirs-recap.png", fullPage: true });

  await page.getByRole("link", { name: "Retour à mes devoirs" }).click();
  await expect(page.getByText("Terminé")).toBeVisible();
});

test("détresse : l'exercice s'arrête, les numéros d'aide s'affichent, le parent est prévenu sans le contenu", async ({
  page,
}) => {
  await parentWithChildSpace(page, "Tom");
  await page.goto("/enfant/devoirs/nouveau");
  await expect(page.getByRole("heading", { name: "Aide aux devoirs" })).toBeVisible();
  await page.getByLabel("Ou tape ton exercice").fill("Calcule 3/4 de 28.");
  await page.getByRole("button", { name: "Envoyer à mon coach" }).click();
  await page.getByRole("button", { name: "Oui, c'est parti !" }).click();
  await page
    .getByPlaceholder("Écris ta réponse ou ta question…")
    .fill("j'arrive pas, au collège on se moque de moi tout le temps");
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Tu n'es pas seul" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Appeler le 3018" })).toHaveAttribute("href", "tel:3018");
  await expect(page.getByRole("link", { name: "Appeler le 119" })).toHaveAttribute("href", "tel:119");
  await expect(page.getByPlaceholder("Écris ta réponse ou ta question…")).toHaveCount(0);
  await page.screenshot({ path: "e2e/__screens__/devoirs-detresse.png", fullPage: true });

  await page.goto("/parent");
  await expect(page.getByText(/Un moment difficile a été signalé pendant que Tom/)).toBeVisible();
  await expect(page.getByText("on se moque de moi")).toHaveCount(0);
  await page.screenshot({ path: "e2e/__screens__/parent-banniere.png" });
});
