import { devices, expect, test, type Page } from "@playwright/test";

const DEV_TEST_EMAIL = "zackzack@test.com";

// Touch-Tablet: Chrome auf Android zeigt PDFs nicht im iframe → pdf.js-Weg.
test.use({ ...devices["Galaxy Tab S4"] });

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

/** true, sobald pdf.js auf der Seite tatsächlich etwas Dunkles (Text) gezeichnet hat. */
function canvasHasInk(canvas: HTMLCanvasElement): boolean {
  const context = canvas.getContext("2d");
  if (!context) return false;
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < data.length; index += 4) {
    if (data[index] < 128 && data[index + 1] < 128 && data[index + 2] < 128) return true;
  }
  return false;
}

test("Tablet: Vorschau zeichnet das PDF mit pdf.js statt im iframe", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await loginWithLocalDevAccount(page);
  await page.goto("/de/renderer-spike/package-02");

  const preview = page.getByTestId("canonical-pdf-preview");
  const pages = page.getByTestId("canonical-pdf-preview-pages").locator("canvas");
  await expect(preview).toHaveAttribute("data-viewer", "canvas");
  await expect(preview).toHaveAttribute("data-render-state", "ready");
  await expect(page.getByTestId("canonical-pdf-preview-frame")).toHaveCount(0);
  await expect(pages).toHaveCount(1);
  expect(await pages.first().evaluate(canvasHasInk)).toBe(true);

  await page.getByTestId("variant-multi-page").click();
  await expect.poll(() => pages.count()).toBeGreaterThan(1);
  await expect(preview).toHaveAttribute("data-render-state", "ready");

  expect(consoleErrors).toEqual([]);
});
