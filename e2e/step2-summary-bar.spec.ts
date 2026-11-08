import { expect, test, type Locator, type Page } from "@playwright/test";
import { deleteAllPositions } from "./support/positions";

const DEV_TEST_EMAIL = "zackzack@test.com";

// Kleiner Laptop: genau hier nahm die frühere Zusammenfassung über die Hälfte der Spalte ein.
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

async function addFreePosition(page: Page, label: string): Promise<void> {
  const cards = page.locator(".d2card");
  const before = await cards.count();
  await page.getByTestId("step2-add-position").click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#ff-label").fill(label);
  await dialog.locator("#ff-price").fill("10");
  await dialog.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(cards).toHaveCount(before + 1);
}

async function box(locator: Locator): Promise<{ top: number; bottom: number; left: number; right: number }> {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error("element not rendered");
  return { top: rect.y, bottom: rect.y + rect.height, left: rect.x, right: rect.x + rect.width };
}

/** Leiste sitzt am unteren Ende der Positionsspalte; die Vorschau behält ihre volle Höhe. */
async function expectBarAtColumnEnd(page: Page): Promise<void> {
  const column = page.getByTestId("step2-positions-column");
  const bar = column.getByTestId("step2-summary-bar");
  await expect(bar).toBeInViewport({ ratio: 1 });
  const [barBox, columnBox, documentBox] = await Promise.all([
    box(bar), box(column), box(page.getByTestId("step2-document-column")),
  ]);
  expect(Math.abs(columnBox.bottom - barBox.bottom)).toBeLessThanOrEqual(2);
  expect(Math.abs(documentBox.bottom - columnBox.bottom)).toBeLessThanOrEqual(2);
}

test("Schritt 2: Summenleiste klebt unten in der Positionsspalte", async ({ page }) => {
  test.setTimeout(180_000);
  await loginWithLocalDevAccount(page);
  await page.goto("/de/dashboard");
  await page.getByTestId("app-sidebar").getByRole("button", { name: "Rechnung erstellen" }).click();
  await page.waitForURL(/\/de\/create\/[^/]+\/1$/);
  const documentId = new URL(page.url()).pathname.split("/")[3];
  await page.goto(`/de/create/${documentId}/2`);
  await deleteAllPositions(page);

  const column = page.getByTestId("step2-positions-column");
  const bar = column.getByTestId("step2-summary-bar");
  const next = bar.getByRole("button", { name: "Weiter" });
  const total = bar.getByTestId("step2-summary-total");

  try {
    // Leer: Leiste trotzdem am Spaltenende, „Weiter" gesperrt, kein „Zurück" mehr.
    await expect(total).toHaveText("0,00 €");
    await expect(next).toBeDisabled();
    await expect(bar.getByText("Zurück")).toHaveCount(0);
    await expectBarAtColumnEnd(page);

    for (let index = 1; index <= 6; index += 1) {
      await addFreePosition(page, `Pos ${index}`);
      // Die neue, aufgeklappte Karte landet oberhalb der Leiste, nicht dahinter.
      const added = page.locator(".d2card").last();
      await expect(added).toHaveAttribute("data-expanded", "1");
      await expect.poll(async () => (await box(added)).bottom - (await box(bar)).top).toBeLessThanOrEqual(1);
    }

    // Lange Liste: sie scrollt unter der Leiste durch, die Leiste bleibt am Spaltenende.
    await expect(total).toHaveText("60,00 €");
    await expect(bar).toContainText("Zwischensumme (netto)");
    await expect(bar).not.toContainText("MwSt.");
    expect(await column.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
    await column.evaluate((element) => { element.scrollTop = 0; });
    await expectBarAtColumnEnd(page);
    await expect(next).toBeEnabled();

    // 19 % auf einer Position: Brutto als Endbetrag, enthaltene MwSt. als eine Zeile.
    const last = page.locator(".d2card").last();
    await last.scrollIntoViewIfNeeded();
    await last.locator(".d2vat").click();
    const editor = page.getByRole("dialog");
    await editor.getByRole("button", { name: "19 %", exact: true }).click();
    await editor.getByRole("button", { name: "Fertig" }).click();
    await expect(total).toHaveText("61,90 €");
    await expect(bar).toContainText("Gesamt (brutto)");
    await expect(bar).toContainText("inkl. 1,90 € MwSt.");

    // RTL: Leiste in der Positionsspalte (rechts), „Weiter" am Zeilenende (links).
    await page.goto(`/ar/create/${documentId}/2`);
    await expect(page.locator(".dapp")).toHaveAttribute("dir", "rtl");
    await expectBarAtColumnEnd(page);
    const arNext = bar.getByRole("button", { name: "التالي" });
    const [nextBox, sumBox] = await Promise.all([box(arNext), box(bar.locator(".d2-foot-sum"))]);
    expect(nextBox.right).toBeLessThan(sumBox.left);
    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )).toBe(false);

    // „Weiter" führt zu Schritt 3.
    await page.goto(`/de/create/${documentId}/2`);
    await next.click();
    await page.waitForURL(new RegExp(`/de/create/${documentId}/3$`));
  } finally {
    await page.goto(`/de/create/${documentId}/2`);
    await deleteAllPositions(page);
  }
});
