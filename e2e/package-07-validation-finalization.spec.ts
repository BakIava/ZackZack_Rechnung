import { expect, test, type Locator, type Page } from "@playwright/test";

const DEV_TEST_EMAIL = "zackzack@test.com";
const DESCRIPTION = "Paket 07 Dokumentprüfung";

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

async function startCustomerlessInvoice(page: Page): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto("/de/dashboard");
    await page.getByRole("button", { name: /Neue Rechnung \/ Angebot/ }).first().click();
    await page.waitForURL(/\/de\/create\/[^/]+\/1$/);
    const documentId = new URL(page.url()).pathname.split("/")[3];

    if (await page.locator('.dcust[data-sel="1"]').count() === 0) {
      await page.locator(".step1-next-button").click();
      await page.waitForURL(new RegExp(`/de/create/${documentId}/2$`));
      return documentId;
    }

    // Ein leerer, älterer Test-Draft kann einen Empfänger tragen. Schritt 1
    // löscht ihn über den bestehenden, ausschließlich für leere Drafts
    // vorgesehenen Zurück-Pfad; der nächste Start ist dadurch kundenlos.
    await page.locator(".dflow-back").click();
    await page.waitForURL(/\/de\/documents$/);
    await page.waitForTimeout(500);
  }
  throw new Error("Kein kundenloser Test-Draft verfügbar");
}

async function openFreePosition(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: /Position hinzufügen/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("tab", { name: "Freie Position" }).click();
  await dialog.locator("#ff-label").fill(DESCRIPTION);
  return dialog;
}

async function previewTotal(page: Page): Promise<number> {
  const value = await page.getByTestId("step2-document-preview").getAttribute(
    "data-preview-total-amount",
  );
  return Number(value ?? 0);
}

test("Paket 7: nur Dokumentregeln blockieren und erlauben die Finalisierung", async ({ page }) => {
  test.setTimeout(240_000);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await loginWithLocalDevAccount(page);

  await page.goto("/de/dashboard");
  await expect(page.getByRole("link", { name: "Einstellungen" })).toHaveCount(0);
  const settingsResponse = await page.request.get("/de/settings");
  expect(settingsResponse.status()).toBe(404);

  const documentId = await startCustomerlessInvoice(page);
  const recipientHint = page.getByTestId("step2-recipient-hint");
  await expect(recipientHint).toHaveCount(0);

  const dialog = await openFreePosition(page);
  await dialog.locator("#ff-price").fill("200");
  await expect.poll(() => previewTotal(page)).toBeLessThanOrEqual(25_000);
  await expect(recipientHint).toHaveCount(0);

  await dialog.locator("#ff-price").fill("300");
  await expect.poll(() => previewTotal(page)).toBeGreaterThan(25_000);
  await expect(recipientHint).toBeVisible();
  await expect(recipientHint.locator("a")).toHaveCount(0);

  await dialog.getByRole("button", { name: "Hinzufügen", exact: true }).click();
  await expect(page.locator(".d2card")).toHaveCount(1);
  await expect(recipientHint).toBeVisible();
  await page.locator(".d2-sum-btn").click();
  await page.waitForURL(new RegExp(`/de/create/${documentId}/3$`));

  const requirements = page.getByTestId("document-requirements");
  await expect(requirements).toBeVisible();
  await expect(requirements.locator(".check-row.bad")).toHaveCount(2);
  await expect(requirements).not.toContainText(/Firmenname|Firmenanschrift|Steuernummer/);
  await expect(page.getByRole("button", { name: "Jetzt abschließen" })).toBeDisabled();

  await requirements.getByRole("link", { name: "Beim Kunden ergänzen" }).first().click();
  await page.waitForURL(new RegExp(`/de/create/${documentId}/1\\?fix=customer$`));
  const customer = page.locator(".dcust:not(.dcust--new)").first();
  await expect(customer).toBeVisible();
  await customer.click();
  await page.locator(".step1-next-button").click();
  await page.waitForURL(new RegExp(`/de/create/${documentId}/2$`));
  await expect(recipientHint).toHaveCount(0);

  await page.locator(".d2-sum-btn").click();
  await page.waitForURL(new RegExp(`/de/create/${documentId}/3$`));
  await expect(page.getByTestId("document-requirements").locator(".check-row.bad")).toHaveCount(0);

  const finalizeButton = page.getByRole("button", { name: "Jetzt abschließen" });
  await expect(finalizeButton).toBeEnabled();
  await finalizeButton.click();
  const finalizeDialog = page.getByRole("dialog");
  await expect(finalizeDialog).toBeVisible();
  await finalizeDialog.getByRole("button", { name: "Abschließen", exact: true }).click();

  await expect(page.locator(".share-success")).toBeVisible();
  await expect(page.locator(".share-success-s")).toContainText(/R-\d{4}-\d{3,}/);
  expect(consoleErrors).toEqual([]);
});
