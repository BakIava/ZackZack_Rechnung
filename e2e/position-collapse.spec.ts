import { expect, test, type Page } from "@playwright/test";
import { deleteAllPositions, expandPosition } from "./support/positions";

const DEV_TEST_EMAIL = "zackzack@test.com";

test.use({ viewport: { width: 1280, height: 900 } });

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

async function addFreePosition(page: Page, label: string, quantity: string, price: string): Promise<void> {
  const cards = page.locator(".d2card");
  const before = await cards.count();
  await page.getByRole("button", { name: /Position hinzufügen/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#ff-label").fill(label);
  await dialog.locator("#ff-qty").fill(quantity);
  await dialog.locator("#ff-price").fill(price);
  await dialog.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(cards).toHaveCount(before + 1);
}

test("Positionen: zugeklappte Zeilen, höchstens eine aufgeklappt", async ({ page }) => {
  test.setTimeout(180_000);
  await loginWithLocalDevAccount(page);
  await page.goto("/de/dashboard");
  await page.getByTestId("app-sidebar").getByRole("button", { name: "Rechnung erstellen" }).click();
  await page.waitForURL(/\/de\/create\/[^/]+\/1$/);
  const documentId = new URL(page.url()).pathname.split("/")[3];
  await page.goto(`/de/create/${documentId}/2`);
  await deleteAllPositions(page);

  const cards = page.locator(".d2card");
  const expanded = page.locator('.d2card[data-expanded="1"]');
  const deleteButtons = page.getByRole("button", { name: "Löschen" });

  try {
    await addFreePosition(page, "Pos A", "2", "10");
    await addFreePosition(page, "Pos B", "1", "20");
    await addFreePosition(page, "Pos C", "3", "5");

    // Nur die zuletzt hinzugefügte Position ist offen, die anderen sind Zeilen.
    await expect(expanded).toHaveCount(1);
    await expect(cards.nth(2)).toHaveAttribute("data-expanded", "1");
    await expect(cards.nth(0)).toHaveAttribute("data-expanded", "0");
    await expect(cards.nth(0)).toContainText("Pos A");
    await expect(cards.nth(0)).toContainText("2 m² × 10,00 €");
    await expect(cards.nth(0)).toContainText("20,00 €");
    await expect(deleteButtons).toHaveCount(1);

    // Zeile antippen: sie öffnet sich, die bisher offene klappt zu.
    await cards.nth(0).locator(".d2row-toggle").click();
    await expect(cards.nth(0)).toHaveAttribute("data-expanded", "1");
    await expect(cards.nth(2)).toHaveAttribute("data-expanded", "0");
    await expect(expanded).toHaveCount(1);

    // Zuklappen: keine Position offen, kein „Löschen" sichtbar.
    await cards.nth(0).getByRole("button", { name: "Position zuklappen" }).click();
    await expect(expanded).toHaveCount(0);
    await expect(deleteButtons).toHaveCount(0);

    // Löschen der offenen Position: danach ist keine mehr offen.
    await expandPosition(cards.nth(1));
    await cards.nth(1).getByRole("button", { name: "Löschen" }).click();
    await expect(cards).toHaveCount(2);
    await expect(expanded).toHaveCount(0);
    await expect(cards.getByTestId("position-name")).toHaveText(["Pos A", "Pos C"]);

    // Umsortieren per Nummer: die offene Position bleibt offen und wandert mit.
    await expandPosition(cards.nth(0));
    await cards.nth(0).getByRole("button", { name: "Position 1 an eine andere Stelle verschieben" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "2", exact: true }).click();
    await expect(cards.getByTestId("position-name")).toHaveText(["Pos C", "Pos A"]);
    await expect(cards.nth(1)).toHaveAttribute("data-expanded", "1");
    await expect(page.locator(".d2-reorder-open")).toBeEnabled();

    // Beim Öffnen der Seite ist keine Position aufgeklappt.
    await page.reload();
    await expect(cards).toHaveCount(2);
    await expect(expanded).toHaveCount(0);
  } finally {
    await deleteAllPositions(page);
  }
});
