import { expect, test, type Page } from "@playwright/test";
import { deleteAllPositions } from "./support/positions";

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

async function clearPositions(page: Page): Promise<void> {
  await deleteAllPositions(page);
}

async function addFreePosition(page: Page, label: string, price: string): Promise<void> {
  const cards = page.locator(".d2card");
  const before = await cards.count();
  await page.getByRole("button", { name: /Position hinzufügen/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#ff-label").fill(label);
  await dialog.locator("#ff-price").fill(price);
  await dialog.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(cards).toHaveCount(before + 1);
}

async function expectOrder(page: Page, labels: string[]): Promise<void> {
  await expect(page.locator(".d2card").getByTestId("position-name")).toHaveText(labels);
  await expect(page.getByTestId("step2-document-preview")).toHaveAttribute(
    "data-preview-descriptions",
    labels.join(" | "),
  );
}

/** Wartet, bis die Speicher-Anfrage durch ist (Button ist währenddessen gesperrt). */
async function waitUntilSaved(page: Page): Promise<void> {
  await expect(page.locator(".d2-reorder-open")).toBeEnabled();
}

test("Positionen umsortieren: Kompaktliste mit Nummer und Pfeilen, Nummer auf der Karte", async ({ page }) => {
  test.setTimeout(180_000);
  await loginWithLocalDevAccount(page);
  await page.goto("/de/dashboard");
  await page.getByTestId("app-sidebar").getByRole("button", { name: "Rechnung erstellen" }).click();
  await page.waitForURL(/\/de\/create\/[^/]+\/1$/);
  const documentId = new URL(page.url()).pathname.split("/")[3];
  await page.goto(`/de/create/${documentId}/2`);
  await clearPositions(page);

  try {
    await addFreePosition(page, "Pos A", "10");
    await addFreePosition(page, "Pos B", "20");
    await addFreePosition(page, "Pos C", "30");
    await expectOrder(page, ["Pos A", "Pos B", "Pos C"]);

    // Kompaktliste: dritte Position per Nummer an Stelle 1, dann „Pos C" einen Schritt nach unten.
    await page.getByRole("button", { name: "Reihenfolge ändern" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("button", { name: "Position 3 an eine andere Stelle verschieben" }).click();
    await sheet.getByRole("button", { name: "1", exact: true }).click();
    await expect(sheet.locator(".reorder-name")).toHaveText(["Pos C", "Pos A", "Pos B"]);
    await sheet.getByRole("button", { name: "Nach unten" }).first().click();
    await expect(sheet.locator(".reorder-name")).toHaveText(["Pos A", "Pos C", "Pos B"]);
    await sheet.getByRole("button", { name: "Fertig" }).click();

    await expectOrder(page, ["Pos A", "Pos C", "Pos B"]);
    await waitUntilSaved(page);
    await page.reload();
    await expectOrder(page, ["Pos A", "Pos C", "Pos B"]);

    // Abbrechen speichert nichts.
    await page.getByRole("button", { name: "Reihenfolge ändern" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Nach oben" }).last().click();
    await page.getByRole("dialog").getByRole("button", { name: "Abbrechen" }).click();
    await expectOrder(page, ["Pos A", "Pos C", "Pos B"]);

    // Nummer direkt auf der Karte: letzte Position an Stelle 1.
    await page.locator(".d2card").nth(2)
      .getByRole("button", { name: "Position 3 an eine andere Stelle verschieben" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "1", exact: true }).click();
    await expectOrder(page, ["Pos B", "Pos A", "Pos C"]);
    await waitUntilSaved(page);
    await page.reload();
    await expectOrder(page, ["Pos B", "Pos A", "Pos C"]);
  } finally {
    await clearPositions(page);
  }
});
