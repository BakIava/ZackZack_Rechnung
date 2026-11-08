import { expect, test, type Page } from "@playwright/test";
import { deleteAllPositions } from "./support/positions";

const DEV_TEST_EMAIL = "zackzack@test.com";

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

/** Füllt die freie Position im bereits offenen Hinzufügen-Dialog aus. */
async function submitFreePosition(page: Page, label: string): Promise<void> {
  const cards = page.locator(".d2card");
  const before = await cards.count();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Freie Position" }).click();
  await dialog.locator("#ff-label").fill(label);
  await dialog.locator("#ff-price").fill("10");
  await dialog.getByRole("button", { name: "Hinzufügen", exact: true }).click();
  await expect(cards).toHaveCount(before + 1);
}

test("Schritt 2: genau ein „Position hinzufügen“ – Leerzustand bzw. am Listenende", async ({ page }) => {
  test.setTimeout(180_000);
  await loginWithLocalDevAccount(page);
  await page.goto("/de/dashboard");
  await page.getByTestId("app-sidebar").getByRole("button", { name: "Rechnung erstellen" }).click();
  await page.waitForURL(/\/de\/create\/[^/]+\/1$/);
  const documentId = new URL(page.url()).pathname.split("/")[3];
  await page.goto(`/de/create/${documentId}/2`);
  await deleteAllPositions(page);

  const column = page.getByTestId("step2-positions-column");
  const add = page.getByTestId("step2-add-position");
  const anyAdd = column.getByRole("button", { name: /Position hinzufügen/ });

  try {
    // Leer: die leere Fläche selbst ist der einzige Button.
    await expect(anyAdd).toHaveCount(1);
    await expect(add).toContainText("Erste Position hinzufügen");
    expect(await add.evaluate((element) => getComputedStyle(element).borderTopStyle)).toBe("solid");
    await add.click();
    await submitFreePosition(page, "Pos 1");

    // Mit Positionen: weiterhin genau einer, direkt nach der letzten Position.
    await expect(anyAdd).toHaveCount(1);
    await expect(add).not.toContainText("Erste");
    const followsLastCard = await add.evaluate((element) => {
      const cards = document.querySelectorAll(".d2card");
      const last = cards[cards.length - 1];
      return Boolean(last && last.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(followsLastCard).toBe(true);

    // Nach jedem Hinzufügen steht der Button ohne Scrollen vollständig über der Summenleiste.
    const bar = column.getByTestId("step2-summary-bar");
    for (let index = 2; index <= 6; index += 1) {
      await add.click();
      await submitFreePosition(page, `Pos ${index}`);
      await expect(add).toBeInViewport({ ratio: 1 });
      await expect.poll(async () => {
        const [addBox, barBox] = await Promise.all([add.boundingBox(), bar.boundingBox()]);
        return addBox && barBox ? barBox.y - (addBox.y + addBox.height) : -1;
      }).toBeGreaterThanOrEqual(0);
    }

    // RTL: derselbe Button funktioniert auch auf Arabisch.
    await page.goto(`/ar/create/${documentId}/2`);
    await expect(page.locator(".dapp")).toHaveAttribute("dir", "rtl");
    await expect(add).toContainText("إضافة بند");
    await add.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  } finally {
    await page.goto(`/de/create/${documentId}/2`);
    await deleteAllPositions(page);
  }
});
