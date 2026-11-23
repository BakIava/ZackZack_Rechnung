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
