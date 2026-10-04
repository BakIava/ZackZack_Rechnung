import { expect, test, type Locator, type Page } from "@playwright/test";

const DEV_TEST_EMAIL = "zackzack@test.com";

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

async function countPdfPages(frame: Locator): Promise<number> {
  return frame.evaluate(async (element: HTMLIFrameElement) => {
    const bytes = new Uint8Array(await (await fetch(element.src)).arrayBuffer());
    const source = new TextDecoder("latin1").decode(bytes);
    return source.match(/\/Type\s*\/Page\b/g)?.length ?? 0;
  });
}

async function chooseVariant(page: Page, variant: string): Promise<void> {
  const frame = page.getByTestId("canonical-pdf-preview-frame");
  const previousUrl = await frame.getAttribute("src");
  await page.getByTestId(`variant-${variant}`).click();
  await expect(page.getByTestId("canonical-pdf-preview")).toHaveAttribute(
    "data-render-state",
    "ready",
  );
  await expect.poll(() => frame.getAttribute("src")).not.toBe(previousUrl);
}

test("Paket 2: ein kanonischer Renderer deckt die rechtlichen Dokumentfälle ab", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await loginWithLocalDevAccount(page);
  await page.goto("/ar/renderer-spike/package-02");

  await expect(page.getByTestId("package-02-harness")).toBeVisible();
  const evidence = page.getByTestId("render-model-evidence");
  await expect(evidence).toHaveAttribute("data-document-language", "de");
  await expect(evidence).toHaveAttribute("data-document-direction", "ltr");
  await expect(evidence).toHaveAttribute("dir", "ltr");

  const preview = page.getByTestId("canonical-pdf-preview");
  const frame = page.getByTestId("canonical-pdf-preview-frame");
  await expect(preview).toHaveAttribute("lang", "de");
  await expect(preview).toHaveAttribute("dir", "ltr");
  await expect(frame).toHaveAttribute("src", /^blob:/);
  await expect.poll(() => countPdfPages(frame)).toBe(1);

  await expect(page.getByTestId("model-title")).toContainText("Rechnung");
  await expect(page.getByTestId("model-ku-note")).toContainText("§ 19 UStG");
  await expect(page.getByTestId("model-tax-lines")).toHaveText("");

  await chooseVariant(page, "quote-ku");
  await expect(page.getByTestId("model-title")).toContainText("Angebot");
  await expect(page.getByTestId("model-service-timing")).toContainText(
    "Leistungszeitraum 01.09.2026 – 15.09.2026",
  );
  await expect(page.getByTestId("model-valid-until")).toHaveText("31.10.2026");
  await expect(page.getByTestId("model-ku-note")).toContainText("§ 19 UStG");

  await chooseVariant(page, "ku-tax");
  await expect(page.getByTestId("model-ku-note")).toHaveCount(0);
  await expect(page.getByTestId("model-tax-lines")).toContainText("Umsatzsteuer 19 %");
  await expect(page.getByTestId("model-row")).toContainText("19 %");

  await chooseVariant(page, "standard-tax");
  await expect(page.getByTestId("model-tax-lines")).toContainText("Umsatzsteuer 7 %");
  await expect(page.getByTestId("model-tax-lines")).toContainText("Umsatzsteuer 19 %");

  await chooseVariant(page, "empty-item");
  const emptyRow = page.getByTestId("model-row");
  await expect(emptyRow).toHaveAttribute("data-description", "");
  await expect(emptyRow).toContainText("0 Stk.");
  await expect(emptyRow).toContainText("0,00");

  await chooseVariant(page, "multi-page");
  await expect.poll(() => countPdfPages(frame)).toBeGreaterThan(1);

  await expect(page.locator("body")).not.toContainText(/Einkaufspreis|Aufschlag|Marge/i);
  expect(consoleErrors).toEqual([]);
});
