import { expect, test, type Locator, type Page } from "@playwright/test";

const DEV_TEST_EMAIL = "zackzack@test.com";
const FREE_DESCRIPTION = "Paket 04 Abdeckarbeiten";
const FOREIGN_DESCRIPTION = "Paket 04 Gerüststellung";
const SAVED_DESCRIPTION = "Paket 04 Gespeicherte Position";

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
    await page.getByRole("button", { name: "Löschen" }).first().click();
    await expect(page.locator(".d2card")).toHaveCount(
      Math.max(0, (await page.locator(".d2card").count()) - 1),
    );
  }
}

async function openPositionModal(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: /Position hinzufügen/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function expectPreview(
  preview: Locator,
  values: { count: number; descriptions?: string; amounts?: string; units?: string; prices?: string },
): Promise<void> {
  await expect(preview).toHaveAttribute("data-preview-position-count", String(values.count));
  if (values.descriptions !== undefined) {
    await expect(preview).toHaveAttribute("data-preview-descriptions", values.descriptions);
  }
  if (values.amounts !== undefined) {
    await expect(preview).toHaveAttribute("data-preview-amounts", values.amounts);
  }
  if (values.units !== undefined) {
    await expect(preview).toHaveAttribute("data-preview-units", values.units);
  }
  if (values.prices !== undefined) {
    await expect(preview).toHaveAttribute("data-preview-unit-prices", values.prices);
  }
}

test("Paket 4: neue Position lebt bis zum Speichern nur in der Vorschau", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await loginWithLocalDevAccount(page);
  await openEmptyStep2(page);

  const preview = page.getByTestId("step2-document-preview");
  await expectPreview(preview, { count: 0 });

  await openPositionModal(page);
  await expect(page.locator(".d2card")).toHaveCount(0);
  await expectPreview(preview, {
    count: 1,
    descriptions: "",
    amounts: "0",
    units: "",
    prices: "0",
  });
  await expect(preview).toHaveAttribute("data-preview-line-totals", "0");

  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".d2card")).toHaveCount(0);
  await expectPreview(preview, { count: 0 });

  let dialog = await openPositionModal(page);
  await dialog.getByRole("tab", { name: "Freie Position" }).click();
  await expectPreview(preview, { count: 1, amounts: "1", units: "m²", prices: "0" });

  await dialog.locator("#ff-label").fill(FREE_DESCRIPTION);
  await expectPreview(preview, { count: 1, descriptions: FREE_DESCRIPTION });
  await dialog.locator("#ff-qty").fill("2.5");
  await expectPreview(preview, { count: 1, amounts: "2.5" });
  await dialog.locator("#ff-unit").click();
  await dialog.getByRole("option", { name: "Std.", exact: true }).click();
  await expectPreview(preview, { count: 1, units: "Std." });
  await dialog.locator("#ff-price").fill("12.40");
  await expectPreview(preview, { count: 1, prices: "1240" });
  await expect(preview).toHaveAttribute("data-preview-line-totals", "3100");

  await dialog.getByRole("button", { name: "Schließen" }).click();
  await expectPreview(preview, { count: 0 });
  await expect(page.locator(".d2card")).toHaveCount(0);

  dialog = await openPositionModal(page);
  await dialog.getByRole("tab", { name: "Fremdleistung" }).click();
  await expectPreview(preview, { count: 1, amounts: "1", units: "Pauschale", prices: "0" });
  await dialog.locator("#fr-label").fill(FOREIGN_DESCRIPTION);
  await dialog.locator("#fr-purchase").fill("100");
  await expectPreview(preview, { count: 1, descriptions: FOREIGN_DESCRIPTION, prices: "12500" });
  await dialog.locator("#fr-markup").fill("50");
  await expectPreview(preview, { count: 1, prices: "15000" });
  const previewMarkup = await preview.evaluate((element) => element.outerHTML);
  expect(previewMarkup).not.toMatch(/Einkauf|Aufschlag|purchase|surcharge|markup|margin/i);

  await dialog.getByRole("button", { name: "Schließen" }).click();
  await expectPreview(preview, { count: 0 });

  dialog = await openPositionModal(page);
  await dialog.getByRole("tab", { name: "Freie Position" }).click();
  await dialog.locator("#ff-label").fill(SAVED_DESCRIPTION);
  await dialog.locator("#ff-qty").fill("2");
  await dialog.locator("#ff-price").fill("10");
  await dialog.getByRole("button", { name: "Hinzufügen", exact: true }).click();

  await expect(page.locator(".d2card")).toHaveCount(1);
  await expectPreview(preview, {
    count: 1,
    descriptions: SAVED_DESCRIPTION,
    amounts: "2",
    units: "m²",
    prices: "1000",
  });
  await expect(preview).toHaveAttribute("data-preview-line-totals", "2000");

  await page.reload();
  await expect(page.locator(".d2card")).toHaveCount(1);
  await expect(page.locator(".d2card")).toContainText(SAVED_DESCRIPTION);
  await expectPreview(preview, {
    count: 1,
    descriptions: SAVED_DESCRIPTION,
    amounts: "2",
    units: "m²",
    prices: "1000",
  });

  await page.getByRole("button", { name: "Löschen" }).click();
  await expect(page.locator(".d2card")).toHaveCount(0);
  await expectPreview(preview, { count: 0 });
  expect(consoleErrors).toEqual([]);
});
