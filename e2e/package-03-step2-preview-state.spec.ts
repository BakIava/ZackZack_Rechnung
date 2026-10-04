import { expect, test, type Locator, type Page } from "@playwright/test";

const DEV_TEST_EMAIL = "zackzack@test.com";
const FOREIGN_DESCRIPTION = "Paket-03 Fremdleistung";

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

async function openCatalog(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Position hinzufügen/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function addCatalogPosition(page: Page, index: number): Promise<string> {
  await openCatalog(page);
  const catalogItems = page.locator(".cat-item");
  await expect(catalogItems.first()).toBeVisible();
  const count = await catalogItems.count();
  const item = catalogItems.nth(Math.min(index, count - 1));
  const description = (await item.locator(".cat-doc b").innerText()).trim();
  await item.click();
  return description;
}

async function expectPreviewCount(preview: Locator, count: number): Promise<void> {
  await expect(preview).toHaveAttribute("data-preview-position-count", String(count));
}

test("Paket 3: Schritt 2 hält Liste, Persistenz und sichere Vorschau synchron", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await loginWithLocalDevAccount(page);
  await page.goto("/de/dashboard");
  await page.getByRole("button", { name: /Neue Rechnung \/ Angebot/ }).first().click();
  await page.waitForURL(/\/de\/create\/[^/]+\/1$/);

  const customer = page.locator(".dcust:not(.dcust--new)").first();
  await expect(customer).toBeVisible();
  const recipientName = (await customer.locator(".dcust-name").innerText()).trim();
  await customer.click();
  await page.locator(".step1-next-button").click();
  await page.waitForURL(/\/de\/create\/[^/]+\/2$/);

  const preview = page.getByTestId("step2-document-preview");
  const frame = page.getByTestId("step2-pdf-preview-frame");
  await expect(preview).toBeVisible();
  await expect(page.getByTestId("step2-preview-company")).not.toHaveText("");
  await expect(page.getByTestId("step2-preview-recipient")).toContainText(recipientName);
  await expectPreviewCount(preview, 0);
  await expect(frame).toHaveAttribute("src", /^blob:/);

  const firstUrl = await frame.getAttribute("src");
  const firstDescription = await addCatalogPosition(page, 0);
  await expect(page.locator(".d2card")).toHaveCount(1);
  await expect(page.locator(".d2card").first()).toContainText(firstDescription);
  await expectPreviewCount(preview, 1);
  await expect(preview).toHaveAttribute("data-preview-descriptions", firstDescription);
  await expect.poll(() => frame.getAttribute("src")).not.toBe(firstUrl);

  const secondDescription = await addCatalogPosition(page, 1);
  await expect(page.locator(".d2card")).toHaveCount(2);
  await expectPreviewCount(preview, 2);

  await page.getByRole("button", { name: "Löschen" }).first().click();
  await expect(page.locator(".d2card")).toHaveCount(1);
  await expect(page.locator(".d2card-num")).toHaveText("1");
  await expect(page.locator(".d2card")).toContainText(secondDescription);
  await expectPreviewCount(preview, 1);
  await expect(preview).toHaveAttribute("data-preview-position-sequence", "1");
  await expect(preview).toHaveAttribute("data-preview-descriptions", secondDescription);

  await page.reload();
  await expect(page.locator(".d2card")).toHaveCount(1);
  await expect(page.locator(".d2card")).toContainText(secondDescription);
  await expectPreviewCount(preview, 1);
  await expect(preview).toHaveAttribute("data-preview-position-sequence", "1");

  await openCatalog(page);
  await page.getByRole("tab", { name: "Fremdleistung" }).click();
  await page.locator("#fr-label").fill(FOREIGN_DESCRIPTION);
  await page.locator("#fr-purchase").fill("100");
  await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
  await expect(page.locator(".d2card")).toHaveCount(2);
  await expectPreviewCount(preview, 2);
  await expect(preview).toHaveAttribute(
    "data-preview-descriptions",
    `${secondDescription} | ${FOREIGN_DESCRIPTION}`,
  );
  const previewMarkup = await preview.evaluate((element) => element.outerHTML);
  expect(previewMarkup).not.toMatch(/Einkauf|Aufschlag|purchase|surcharge|margin/i);

  await page.getByRole("button", { name: "Löschen" }).first().click();
  await expectPreviewCount(preview, 1);
  await page.getByRole("button", { name: "Löschen" }).first().click();
  await expectPreviewCount(preview, 0);

  expect(consoleErrors).toEqual([]);
});
