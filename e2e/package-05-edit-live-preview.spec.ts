import { expect, test, type Locator, type Page } from "@playwright/test";

const DEV_TEST_EMAIL = "zackzack@test.com";
const NORMAL_DESCRIPTION = "Paket 05 Malerarbeiten";
const FOREIGN_DESCRIPTION = "Paket 05 Gerüststellung";

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

async function openEmptyStep2(page: Page): Promise<void> {
  await page.goto("/de/dashboard");
  await page.getByRole("button", { name: /Neue Rechnung \/ Angebot/ }).first().click();
  await page.waitForURL(/\/de\/create\/[^/]+\/1$/);
  const customer = page.locator(".dcust:not(.dcust--new)").first();
  await expect(customer).toBeVisible();
  await customer.click();
  await page.locator(".step1-next-button").click();
  await page.waitForURL(/\/de\/create\/[^/]+\/2$/);

  while (await page.locator(".d2card").count()) {
    const count = await page.locator(".d2card").count();
    await page.getByRole("button", { name: "Löschen" }).first().click();
    await expect(page.locator(".d2card")).toHaveCount(count - 1);
  }
}

async function openAddModal(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: /Position hinzufügen/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function addNormalPosition(page: Page): Promise<void> {
  const dialog = await openAddModal(page);
  await dialog.getByRole("tab", { name: "Freie Position" }).click();
  await dialog.locator("#ff-label").fill(NORMAL_DESCRIPTION);
  await dialog.locator("#ff-qty").fill("2");
  await dialog.locator("#ff-price").fill("10");
  await dialog.getByRole("button", { name: "Hinzufügen", exact: true }).click();
  await expect(page.locator(".d2card")).toHaveCount(1);
}

async function addForeignPosition(page: Page): Promise<void> {
  const dialog = await openAddModal(page);
  await dialog.getByRole("tab", { name: "Fremdleistung" }).click();
  await dialog.locator("#fr-label").fill(FOREIGN_DESCRIPTION);
  await dialog.locator("#fr-purchase").fill("100");
  await dialog.getByRole("button", { name: "Hinzufügen", exact: true }).click();
  await expect(page.locator(".d2card")).toHaveCount(2);
}

async function expectAttribute(preview: Locator, name: string, value: string): Promise<void> {
  await expect(preview).toHaveAttribute(name, value);
}

async function fillNumberPad(page: Page, value: string): Promise<Locator> {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator(".d2pad-input").fill(value);
  return dialog;
}

async function waitForStep2Hydration(page: Page): Promise<void> {
  await expect(page.getByTestId("step2-pdf-preview-frame")).toHaveAttribute("src", /^blob:/);
}

test("Paket 5: bestehende Positionen ändern die Vorschau vor dem Commit", async ({ page }) => {
  test.setTimeout(180_000);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await loginWithLocalDevAccount(page);
  await openEmptyStep2(page);
  await addNormalPosition(page);
  await addForeignPosition(page);

  const preview = page.getByTestId("step2-document-preview");
  const cards = page.locator(".d2card");
  const normal = cards.nth(0);
  const foreign = cards.nth(1);
  await expectAttribute(preview, "data-preview-unit-prices", "1000,12500");
  await expectAttribute(preview, "data-preview-amounts", "2,1");

  await normal.locator(".d2title-btn").click();
  const descriptionDialog = page.getByRole("dialog");
  await descriptionDialog.getByRole("textbox").fill("Nur lokale Bezeichnung");
  await expectAttribute(
    preview,
    "data-preview-descriptions",
    `Nur lokale Bezeichnung | ${FOREIGN_DESCRIPTION}`,
  );
  await descriptionDialog.getByRole("button", { name: "Schließen" }).click();
  await expectAttribute(
    preview,
    "data-preview-descriptions",
    `${NORMAL_DESCRIPTION} | ${FOREIGN_DESCRIPTION}`,
  );

  await normal.getByRole("button", { name: /Preis/ }).click();
  await fillNumberPad(page, "15");
  await expectAttribute(preview, "data-preview-unit-prices", "1500,12500");
  await page.reload();
  await expectAttribute(preview, "data-preview-unit-prices", "1000,12500");
  await waitForStep2Hydration(page);

  await normal.locator(".d2unit").click();
  let editor = page.getByRole("dialog");
  await editor.getByRole("button", { name: "Std.", exact: true }).click();
  await expectAttribute(preview, "data-preview-units", "Std. | Pauschale");
  await page.keyboard.press("Escape");
  await expectAttribute(preview, "data-preview-units", "m² | Pauschale");

  await normal.getByRole("button", { name: /Menge/ }).click();
  let pad = await fillNumberPad(page, "3");
  await expectAttribute(preview, "data-preview-amounts", "3,1");
  await expectAttribute(preview, "data-preview-line-totals", "3000,12500");
  await pad.getByRole("button", { name: "Fertig" }).click();
  await expectAttribute(preview, "data-preview-amounts", "3,1");
  await page.reload();
  await expectAttribute(preview, "data-preview-amounts", "3,1");
  await waitForStep2Hydration(page);

  await normal.locator(".d2unit").click();
  editor = page.getByRole("dialog");
  await editor.getByRole("button", { name: "Std.", exact: true }).click();
  await editor.getByRole("button", { name: "Fertig" }).click();
  await expectAttribute(preview, "data-preview-units", "Std. | Pauschale");

  await normal.locator(".d2vat").click();
  editor = page.getByRole("dialog");
  await editor.getByRole("button", { name: "19 %", exact: true }).click();
  await expectAttribute(preview, "data-preview-tax-rates", "19,0");
  await expectAttribute(preview, "data-preview-tax-group-rates", "19,0");
  await expectAttribute(preview, "data-preview-tax-group-amounts", "570,0");
  await expectAttribute(preview, "data-preview-tax-amount", "570");
  await expectAttribute(preview, "data-preview-total-amount", "16070");
  await page.locator(".position-editor-overlay").click({ position: { x: 5, y: 5 } });
  await expectAttribute(preview, "data-preview-tax-rates", "0,0");
  await expectAttribute(preview, "data-preview-tax-group-rates", "0");
  await expectAttribute(preview, "data-preview-total-amount", "15500");

  await normal.locator(".d2vat").click();
  editor = page.getByRole("dialog");
  await editor.getByRole("button", { name: "19 %", exact: true }).click();
  await editor.getByRole("button", { name: "Fertig" }).click();
  await expectAttribute(preview, "data-preview-tax-rates", "19,0");
  await page.reload();
  await expectAttribute(preview, "data-preview-tax-rates", "19,0");
  await expectAttribute(preview, "data-preview-total-amount", "16070");
  await expectAttribute(preview, "data-preview-units", "Std. | Pauschale");
  await waitForStep2Hydration(page);

  await foreign.getByRole("button", { name: /Einkauf/ }).click();
  pad = await fillNumberPad(page, "200");
  await expectAttribute(preview, "data-preview-unit-prices", "1000,12500");
  await page.keyboard.press("Escape");
  await expect(foreign).toContainText(/100,00/);

  await foreign.getByRole("button", { name: /Aufschlag/ }).click();
  await fillNumberPad(page, "50");
  await expectAttribute(preview, "data-preview-unit-prices", "1000,15000");
  await page.reload();
  await expectAttribute(preview, "data-preview-unit-prices", "1000,12500");
  await waitForStep2Hydration(page);

  await foreign.getByRole("button", { name: /Verkaufspreis/ }).click();
  pad = await fillNumberPad(page, "160");
  await expectAttribute(preview, "data-preview-unit-prices", "1000,16000");
  await pad.getByRole("button", { name: "Schließen" }).click();
  await expectAttribute(preview, "data-preview-unit-prices", "1000,12500");

  await foreign.getByRole("button", { name: /Verkaufspreis/ }).click();
  pad = await fillNumberPad(page, "140");
  await expectAttribute(preview, "data-preview-unit-prices", "1000,14000");
  const safePreviewMarkup = await preview.evaluate((element) => element.outerHTML);
  expect(safePreviewMarkup).not.toMatch(/Einkauf|Aufschlag|purchase|surcharge|markup|margin/i);
  await pad.getByRole("button", { name: "Fertig" }).click();
  await expectAttribute(preview, "data-preview-unit-prices", "1000,14000");
  await page.reload();
  await expectAttribute(preview, "data-preview-unit-prices", "1000,14000");
  await expectAttribute(preview, "data-preview-total-amount", "17570");
  await waitForStep2Hydration(page);

  await page.getByRole("button", { name: "Löschen" }).first().click();
  await expect(cards).toHaveCount(1);
  await page.getByRole("button", { name: "Löschen" }).click();
  await expect(cards).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});
