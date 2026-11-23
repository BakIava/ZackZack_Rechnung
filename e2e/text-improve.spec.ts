import { expect, test, type Page } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

const screenshotStyle = "nextjs-portal { display: none; }";

function bezeichnung(page: Page) {
  return page.locator("#text-improve-bezeichnung");
}

async function improve(page: Page, text: string, button = "Text verbessern") {
  await bezeichnung(page).fill(text);
  await page.getByRole("button", { name: button }).first().click();
}

test("Vorschlag übernehmen, behalten und bei Weitertippen verwerfen", async ({ page }, testInfo) => {
  await page.goto("/de/nachweis-test?view=text-improve");
  const trigger = page.getByRole("button", { name: "Text verbessern" }).first();

  await bezeichnung(page).fill("f");
  await expect(trigger).toBeDisabled();

  await improve(page, "fliesen verlegn bad 12 m2");
  await expect(page.getByRole("button", { name: "Wird verbessert …" })).toBeDisabled();
  const card = page.locator(".text-improve-card");
  await expect(card).toContainText("Fliesen verlegen im Bad, 12 m²");
  await expect(card.locator(".text-improve-text")).toHaveAttribute("dir", "ltr");
  await page.screenshot({ path: testInfo.outputPath("de-vorschlag.png"), style: screenshotStyle });

  await card.getByRole("button", { name: "Übernehmen" }).click();
  await expect(bezeichnung(page)).toHaveValue("Fliesen verlegen im Bad, 12 m²");
  await expect(card).toHaveCount(0);
  await expect(trigger).toBeEnabled();

  await improve(page, "fliesen verlegn bad 12 m2");
  await card.getByRole("button", { name: "Behalten" }).click();
  await expect(bezeichnung(page)).toHaveValue("fliesen verlegn bad 12 m2");
  await expect(card).toHaveCount(0);

  await improve(page, "fliesen verlegn bad 12 m2");
  await expect(card).toBeVisible();
  await bezeichnung(page).press("End");
  await bezeichnung(page).pressSequentially(" x");
  await expect(card).toHaveCount(0);
  await expect(trigger).toBeVisible();
});

test("Hinweise ohne Vorschlag lassen den Text unverändert", async ({ page }) => {
  await page.goto("/de/nachweis-test?view=text-improve");
  const notice = page.locator(".text-improve-notice");

  for (const [text, message] of [
    ["Fliesen verlegen", "Dein Text ist schon gut."],
    ["banyo fayans", "Das klappt nur mit deutschem Text."],
    ["limit", "Tageslimit erreicht: 50 Verbesserungen pro Tag."],
    ["unbekannt", "Das hat nicht geklappt."],
  ]) {
    await improve(page, text);
    await expect(notice).toContainText(message);
    await expect(bezeichnung(page)).toHaveValue(text);
    await notice.getByRole("button", { name: "Hinweis schließen" }).click();
    await expect(notice).toHaveCount(0);
  }
});

test("Zusatztext behält Zeilen; Arabisch bleibt RTL ohne Überlauf", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/ar/nachweis-test?view=text-improve");
  await expect(page.locator(".text-improve-harness")).toHaveAttribute("dir", "rtl");

  await page.locator("#text-improve-zusatztext").fill("inkl entsorgung");
  await page.getByRole("button", { name: "تحسين النص" }).nth(1).click();
  const card = page.locator(".text-improve-card");
  await expect(card.locator(".text-improve-text")).toHaveText("Inkl. Entsorgung des Altmaterials\nUntergrund vorher gereinigt");
  await expect(card.getByRole("button", { name: "اعتماد" })).toBeVisible();

  const overflow = await page.locator(".text-improve-harness").evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("ar-360-zusatztext.png"), style: screenshotStyle });

  await card.getByRole("button", { name: "اعتماد" }).click();
  await expect(page.locator("#text-improve-zusatztext")).toHaveValue("Inkl. Entsorgung des Altmaterials\nUntergrund vorher gereinigt");
});

test("Texte prüfen: ein Aufruf, Häkchen und gemeinsame Übernahme", async ({ page }, testInfo) => {
  await page.goto("/de/nachweis-test?view=text-improve");
  const harness = page.locator(".text-check-harness");
  const dialog = page.getByRole("dialog", { name: "Texte prüfen" });

  await page.getByRole("button", { name: "Texte prüfen" }).click();
  await expect(dialog.getByText("Texte werden geprüft …")).toBeVisible();
  await expect(harness).toHaveAttribute("data-check-calls", "1");
  const rows = dialog.locator(".text-check-row");
  await expect(rows).toHaveCount(2);
  await expect(dialog.getByText("Position 2", { exact: true })).toHaveCount(0);
  await expect(rows.nth(0)).toContainText("fliesen verlegn bad 12 m2");
  await expect(rows.nth(0)).toContainText("Fliesen verlegen im Bad, 12 m²");
  await expect(rows.nth(1)).toContainText("Inkl. Entfernen der alten Fugen");
  await page.screenshot({ path: testInfo.outputPath("de-texte-pruefen.png"), style: screenshotStyle });

  await rows.nth(1).getByRole("checkbox").uncheck();
  await dialog.getByRole("button", { name: "1 Position übernehmen" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("item-1")).toHaveText("Fliesen verlegen im Bad, 12 m²");
  await expect(page.getByTestId("item-2")).toHaveText("Malerarbeiten Wandfläche");
  await expect(page.getByTestId("item-3")).toContainText("silikon fuge erneuern");

  await page.getByRole("button", { name: "Texte prüfen" }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0)).toContainText("Silikonfugen erneuern");
  await dialog.getByRole("button", { name: "1 Position übernehmen" }).click();
  await expect(page.getByTestId("item-3")).toContainText("Silikonfugen erneuern");
  await expect(page.getByTestId("item-3")).toContainText("Inkl. Entfernen der alten Fugen");

  await page.getByRole("button", { name: "Texte prüfen" }).click();
  await expect(dialog.getByText("Alle Texte sind schon gut.")).toBeVisible();
  await dialog.getByRole("button", { name: "Schließen" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(harness).toHaveAttribute("data-check-calls", "3");
});

test("Texte prüfen auf Arabisch bei 360 px ohne Überlauf", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/ar/nachweis-test?view=text-improve");
  await page.getByRole("button", { name: "فحص النصوص" }).click();
  const dialog = page.getByRole("dialog", { name: "فحص النصوص" });
  await expect(dialog.locator(".text-check-row")).toHaveCount(2);
  await expect(dialog.locator(".text-check-new").first()).toHaveAttribute("dir", "ltr");
  const overflow = await dialog.locator(".text-check-dialog").evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("ar-360-texte-pruefen.png"), style: screenshotStyle });
  await dialog.getByRole("button", { name: "اعتماد بندين" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("item-1")).toHaveText("Fliesen verlegen im Bad, 12 m²");
});

test("Texte prüfen sitzt in der Positionsleiste von Schritt 2", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/ar/nachweis-test?view=position-selection");
  const bar = page.locator(".position-selection-bar");
  await expect(bar.getByRole("button", { name: "فحص النصوص" })).toBeVisible();
  expect(await bar.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("ar-360-positionsleiste.png"), style: screenshotStyle });

  // Echte Server-Action ohne Anmeldung: sauberer Fehlerhinweis statt Absturz.
  await bar.getByRole("button", { name: "فحص النصوص" }).click();
  const dialog = page.getByRole("dialog", { name: "فحص النصوص" });
  await expect(dialog.getByText("لم ينجح ذلك. تبقى نصوصك كما هي.")).toBeVisible();
  await dialog.getByRole("button", { name: "إغلاق" }).click();
  await expect(dialog).toHaveCount(0);
});
