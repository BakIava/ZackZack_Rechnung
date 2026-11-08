import { expect, test, type Locator, type Page } from "@playwright/test";
import { deleteAllPositions } from "./support/positions";

const DEV_TEST_EMAIL = "zackzack@test.com";

// Kleiner Laptop: hier rutschte die Summe früher immer in eine zweite Zeile.
test.use({ viewport: { width: 1280, height: 720 } });

async function loginWithLocalDevAccount(page: Page): Promise<void> {
  await page.goto("/de/login");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.getByLabel("E-Mail-Adresse").fill(DEV_TEST_EMAIL);
  await page.getByRole("button", { name: "Code anfordern" }).click();
  const digits = page.locator(".lg-cell");
  await expect(digits).toHaveCount(6);
  for (let index = 0; index < 6; index += 1) await digits.nth(index).fill("1");
  await page.waitForURL(/\/(dashboard|setup)$/);
}

/** Summe steht in derselben Zeile wie das Mengenfeld. */
async function expectSumOnSameLine(card: Locator): Promise<void> {
  const sameLine = await card.evaluate((element) => {
    const quantity = element.querySelector(".d2card-eq .d2field")!.getBoundingClientRect();
    const sum = element.querySelector(".d2card-res")!.getBoundingClientRect();
    return sum.top < quantity.bottom;
  });
  expect(sameLine).toBe(true);
}

test("Aufgeklappte Position: Menge × Preis = Summe in einer Zeile", async ({ page }) => {
  test.setTimeout(120_000);
  await loginWithLocalDevAccount(page);
  await page.goto("/de/dashboard");
  await page.getByTestId("app-sidebar").getByRole("button", { name: "Rechnung erstellen" }).click();
  await page.waitForURL(/\/de\/create\/[^/]+\/1$/);
  const documentId = new URL(page.url()).pathname.split("/")[3];
  await page.goto(`/de/create/${documentId}/2`);
  await deleteAllPositions(page);

  try {
    await page.getByTestId("step2-add-position").click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("#ff-label").fill("Wände streichen");
    await dialog.locator("#ff-price").fill("123");
    await dialog.getByRole("button", { name: "Hinzufügen" }).click();
    const card = page.locator(".d2card").first();
    await expect(card).toHaveAttribute("data-expanded", "1");
    await expect(card.locator(".d2-sumval")).toHaveText("123,00 €");
    await expectSumOnSameLine(card);

    await page.goto(`/ar/create/${documentId}/2`);
    await expect(page.locator(".dapp")).toHaveAttribute("dir", "rtl");
    await card.locator(".d2row-toggle").click();
    await expect(card).toHaveAttribute("data-expanded", "1");
    await expectSumOnSameLine(card);
  } finally {
    await page.goto(`/de/create/${documentId}/2`);
    await deleteAllPositions(page);
  }
});
