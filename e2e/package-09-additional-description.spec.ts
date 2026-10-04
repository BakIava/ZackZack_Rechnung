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

async function openEmptyStep2(page: Page): Promise<string> {
  await page.goto("/de/dashboard");
  await page.getByRole("button", { name: /Neue Rechnung \/ Angebot/ }).first().click();
  await page.waitForURL(/\/de\/create\/[^/]+\/1$/);
  await page.locator(".dcust:not(.dcust--new)").first().click();
  await page.locator(".step1-next-button").click();
  await page.waitForURL(/\/de\/create\/[^/]+\/2$/);
  await clearPositions(page);
  return new URL(page.url()).pathname.split("/")[3];
}

async function clearPositions(page: Page): Promise<void> {
  const cards = page.locator(".d2card");
  while (await cards.count()) {
    const count = await cards.count();
    await cards.first().getByRole("button", { name: "Löschen" }).click();
    await expect(cards).toHaveCount(count - 1);
  }
}

async function openAddModal(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: /Position hinzufügen/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function addThreeOrigins(page: Page): Promise<void> {
  let dialog = await openAddModal(page);
  await dialog.locator(".cat-item").first().click();
  await expect(page.locator(".d2card")).toHaveCount(1);

  dialog = await openAddModal(page);
  await dialog.getByRole("tab", { name: "Freie Position" }).click();
  await dialog.locator("#ff-label").fill("Freie Malerarbeit");
  await dialog.locator("#ff-price").fill("10");
  await dialog.getByRole("button", { name: "Hinzufügen", exact: true }).click();
  await expect(page.locator(".d2card")).toHaveCount(2);

  dialog = await openAddModal(page);
  await dialog.getByRole("tab", { name: "Fremdleistung" }).click();
  await dialog.locator("#fr-label").fill("Gerüststellung");
  await dialog.locator("#fr-purchase").fill("100");
  await dialog.getByRole("button", { name: "Hinzufügen", exact: true }).click();
  await expect(page.locator(".d2card")).toHaveCount(3);
}

async function expectTwoLineClamp(locator: Locator): Promise<void> {
  const metrics = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      clamp: style.webkitLineClamp,
      height: element.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(style.lineHeight),
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    };
  });
  expect(metrics.clamp).toBe("2");
  expect(metrics.height).toBeLessThanOrEqual(metrics.lineHeight * 2 + 1);
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
}

test("Positionsbeschreibungen: eigene Bearbeitung, Speichern, Leeren und RTL", async ({ page }) => {
  test.setTimeout(300_000);
  await loginWithLocalDevAccount(page);
  const documentId = await openEmptyStep2(page);
  const cards = page.locator(".d2card");

  try {
    await addThreeOrigins(page);
    await expect(page.getByRole("button", { name: "Beschreibung hinzufügen" })).toHaveCount(3);
    const catalog = cards.nth(0);
    const name = await catalog.locator(".d2-name").textContent();
    const price = await catalog.locator(".d2-sumval").textContent();

    await catalog.getByRole("button", { name: "Beschreibung hinzufügen" }).click();
    let dialog = page.getByRole("dialog", { name: "Positionsbeschreibung" });
    let textarea = dialog.getByRole("textbox", { name: "Positionsbeschreibung" });
    await expect(dialog).toContainText("Bitte auf Deutsch schreiben");
    await expect(textarea).not.toHaveAttribute("maxlength");
    await textarea.fill("Erste Zeile");
    await textarea.press("Enter");
    await textarea.type("Zweite Zeile");
    await expect(textarea).toHaveValue("Erste Zeile\nZweite Zeile");
    await expect(catalog.locator(".d2card-additional-description")).toContainText("Zweite Zeile");
    await textarea.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(catalog.locator(".d2card-additional-description")).toHaveCount(0);

    await catalog.getByRole("button", { name: "Beschreibung hinzufügen" }).click();
    dialog = page.getByRole("dialog", { name: "Positionsbeschreibung" });
    textarea = dialog.getByRole("textbox", { name: "Positionsbeschreibung" });
    const longText = "Vorbereitung\nAnstrich\n" + "Weiterer deutscher Text ".repeat(200);
    await textarea.fill(longText);
    await expect(catalog.locator(".d2card-additional-description")).toContainText("Vorbereitung");
    await textarea.press("Control+Enter");
    await expect(dialog).toHaveCount(0);
    await expect(catalog.getByRole("button", { name: "Beschreibung bearbeiten" })).toBeEnabled();
    await expectTwoLineClamp(catalog.locator(".d2card-additional-description"));
    expect(await catalog.locator(".d2-name").textContent()).toBe(name);
    expect(await catalog.locator(".d2-sumval").textContent()).toBe(price);

    await page.reload();
    await expect(cards.nth(0).getByRole("button", { name: "Beschreibung bearbeiten" })).toBeVisible();
    await cards.nth(0).getByRole("button", { name: "Beschreibung bearbeiten" }).click();
    dialog = page.getByRole("dialog", { name: "Positionsbeschreibung" });
    textarea = dialog.getByRole("textbox", { name: "Positionsbeschreibung" });
    await expect(textarea).toHaveValue(longText);
    await textarea.fill("  \n  ");
    await dialog.getByRole("button", { name: "Speichern" }).click();
    await expect(cards.nth(0).getByRole("button", { name: "Beschreibung hinzufügen" })).toBeEnabled();
    await expect(cards.nth(0).locator(".d2card-additional-description")).toHaveCount(0);

    await cards.nth(1).getByRole("button", { name: "Beschreibung hinzufügen" }).click();
    dialog = page.getByRole("dialog", { name: "Positionsbeschreibung" });
    await dialog.getByRole("textbox", { name: "Positionsbeschreibung" }).fill("Freie Arbeit\nMit Material");
    await dialog.getByRole("button", { name: "Speichern" }).click();
    await expect(cards.nth(1).getByRole("button", { name: "Beschreibung bearbeiten" })).toBeEnabled();
    await page.reload();
    await cards.nth(1).getByRole("button", { name: "Beschreibung bearbeiten" }).click();
    dialog = page.getByRole("dialog", { name: "Positionsbeschreibung" });
    await expect(dialog.getByRole("textbox", { name: "Positionsbeschreibung" }))
      .toHaveValue("Freie Arbeit\nMit Material");
    await dialog.getByRole("textbox", { name: "Positionsbeschreibung" }).fill("Freie Arbeit\nGeändert");
    await dialog.getByRole("button", { name: "Speichern" }).click();
    await expect(cards.nth(1).getByRole("button", { name: "Beschreibung bearbeiten" })).toBeEnabled();
    await cards.nth(1).getByRole("button", { name: "Beschreibung bearbeiten" }).click();
    dialog = page.getByRole("dialog", { name: "Positionsbeschreibung" });
    await dialog.getByRole("textbox", { name: "Positionsbeschreibung" }).fill(" ");
    await dialog.getByRole("button", { name: "Speichern" }).click();
    await expect(cards.nth(1).getByRole("button", { name: "Beschreibung hinzufügen" })).toBeEnabled();

    await cards.nth(2).getByRole("button", { name: "Beschreibung hinzufügen" }).click();
    dialog = page.getByRole("dialog", { name: "Positionsbeschreibung" });
    await dialog.getByRole("textbox", { name: "Positionsbeschreibung" }).fill("Aufbau\nAbbau\nWeitere Arbeiten");
    await dialog.getByRole("button", { name: "Speichern" }).click();
    await expect(cards.nth(2).getByRole("button", { name: "Beschreibung bearbeiten" })).toBeEnabled();

    await page.goto(`/ar/create/${documentId}/2`);
    await expect(page.locator(".dapp")).toHaveAttribute("dir", "rtl");
    await page.locator(".d2-positions").evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await cards.nth(2).getByRole("button", { name: "تعديل الوصف التفصيلي" }).click();
    dialog = page.getByRole("dialog", { name: "الوصف التفصيلي للبند" });
    await expect(dialog).toContainText("يرجى الكتابة بالألمانية");
    textarea = dialog.getByRole("textbox", { name: "الوصف التفصيلي للبند" });
    await expect(textarea).toHaveAttribute("dir", "ltr");
    await expect(textarea).toHaveValue("Aufbau\nAbbau\nWeitere Arbeiten");
    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )).toBe(false);
    await dialog.getByRole("button", { name: "إغلاق" }).click();

    await page.goto(`/de/documents/${documentId}`);
    const detailDescription = page.locator(".hpos-additional-description");
    await expect(detailDescription).toContainText("Aufbau");
    await expectTwoLineClamp(detailDescription);

    await page.goto(`/de/create/${documentId}/2`);
    await page.locator(".d2-positions").evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await cards.nth(2).getByRole("button", { name: "Beschreibung bearbeiten" }).click();
    dialog = page.getByRole("dialog", { name: "Positionsbeschreibung" });
    await dialog.getByRole("textbox", { name: "Positionsbeschreibung" }).fill("");
    await dialog.getByRole("button", { name: "Speichern" }).click();
    await expect(cards.nth(2).getByRole("button", { name: "Beschreibung hinzufügen" })).toBeEnabled();
  } finally {
    await page.goto(`/de/create/${documentId}/2`);
    await clearPositions(page);
  }
});
