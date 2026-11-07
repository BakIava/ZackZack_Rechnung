import { expect, test, type Page } from "@playwright/test";

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

async function sidebarWidth(page: Page): Promise<number> {
  const box = await page.getByTestId("app-sidebar").boundingBox();
  return box?.width ?? 0;
}

test("Sidebar: Einklappen bleibt nach Neuladen, Seitenwechsel und Sprachwechsel erhalten", async ({ page }) => {
  await loginWithLocalDevAccount(page);
  await page.goto("/de/dashboard");
  const sidebar = page.getByTestId("app-sidebar");

  await expect(sidebar).toHaveAttribute("data-collapsed", "false");
  await expect.poll(() => sidebarWidth(page)).toBeGreaterThan(240);

  const collapse = sidebar.getByRole("button", { name: "Menü einklappen" });
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  await collapse.click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
  await expect(sidebar.getByRole("button", { name: "Menü ausklappen" }))
    .toHaveAttribute("aria-expanded", "false");
  await expect.poll(() => sidebarWidth(page)).toBeLessThanOrEqual(78);
  // Eingeklappt bleibt jeder Menüpunkt über seinen Namen erreichbar.
  await expect(sidebar.getByRole("link", { name: "Kunden" })).toBeVisible();

  await page.reload();
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");

  await sidebar.getByRole("link", { name: "Kunden" }).click();
  await page.waitForURL(/\/de\/customers$/);
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");

  await page.goto("/ar/dashboard");
  await expect(page.locator(".dapp")).toHaveAttribute("dir", "rtl");
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
  await sidebar.getByRole("button", { name: "توسيع القائمة" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");
  await expect.poll(() => sidebarWidth(page)).toBeGreaterThan(240);

  await page.reload();
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");
});

test("Sidebar: Schritt 2 startet eingeklappt, Umschalten dort ändert die gespeicherte Wahl nicht", async ({ page }) => {
  await loginWithLocalDevAccount(page);
  await page.goto("/de/dashboard");
  const sidebar = page.getByTestId("app-sidebar");
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");

  await sidebar.getByRole("button", { name: "Rechnung erstellen" }).click();
  await page.waitForURL(/\/de\/create\/[^/]+\/1$/);
  const documentId = new URL(page.url()).pathname.split("/")[3];
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");

  await page.goto(`/de/create/${documentId}/2`);
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
  await sidebar.getByRole("button", { name: "Menü ausklappen" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");
  await sidebar.getByRole("button", { name: "Menü einklappen" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");

  await page.goto("/de/dashboard");
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");
});
