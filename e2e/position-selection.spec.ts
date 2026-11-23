import { expect, test, type Page } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

const screenshotStyle = "nextjs-portal { display: none; }";

function rows(page: Page) {
  return page.locator(".d2card");
}

async function enterSelection(page: Page, name = "Auswählen") {
  await page.getByRole("button", { name, exact: true }).click();
  await expect(rows(page).first().getByRole("button", { pressed: false })).toBeVisible();
}

async function selectRows(page: Page, indexes: number[]) {
  for (const index of indexes) {
    await rows(page).nth(index).getByRole("button", { pressed: false }).click();
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  for (const selector of [".step2-frame", ".step2-main__scroll", ".position-selection-bar", ".d2-positions"]) {
    const width = await page.locator(selector).evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(width, selector).toBeLessThanOrEqual(1);
  }
}

test("Sammel-MwSt. mit gemischter Auswahl, Vorschau, Summen und Dokumentstandard", async ({ page }, testInfo) => {
  await page.goto("/de/nachweis-test?view=position-selection");
  await rows(page).first().getByRole("button", { expanded: false, name: /Türen einstellen/ }).click();
  await expect(rows(page).first()).toHaveAttribute("data-expanded", "1");
  await enterSelection(page);
  await expect(page.getByRole("button", { name: "MwSt. ändern" })).toBeDisabled();
  await expect(page.locator('.d2card[data-expanded="1"]')).toHaveCount(0);
  await selectRows(page, [0, 2]);
  await expect(page.getByText("2 ausgewählt")).toBeVisible();

  await page.getByRole("button", { name: "MwSt. ändern" }).click();
  const dialog = page.getByRole("dialog", { name: "MwSt. ändern" });
  await expect(dialog.getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "MwSt. übernehmen" })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("de-sammel-mwst.png"), style: screenshotStyle });
  await dialog.getByRole("radio", { name: "19 %", exact: true }).check();
  await dialog.getByRole("button", { name: "MwSt. übernehmen" }).click();
  await expect(dialog).toHaveCount(0);

  const preview = page.getByTestId("step2-document-preview");
  await expect(preview).toHaveAttribute("data-preview-tax-rates", "19,19,19");
  await expect(preview).toHaveAttribute("data-preview-total-amount", "20825");
  await expect(page.getByTestId("step2-summary-total")).toHaveText("208,25 €");

  await enterSelection(page);
  await selectRows(page, [0, 2]);
  await page.getByRole("button", { name: "MwSt. ändern" }).click();
  await expect(dialog.getByRole("radio", { name: "19 %", exact: true })).toBeChecked();
  await dialog.getByRole("radio", { name: "Standard (19 %)" }).check();
  await dialog.getByRole("button", { name: "MwSt. übernehmen" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(preview).toHaveAttribute("data-preview-total-amount", "20825");
  await expect(page.locator(".d2row-chip")).toHaveCount(0);
});

test("Sammellöschen fragt nach, behält die Auswahl bei Fehlern und verhindert Mehrfachaufrufe", async ({ page }) => {
  await page.goto("/de/nachweis-test?view=position-selection&failure=once");
  await enterSelection(page);
  await selectRows(page, [0, 2]);
  await page.getByRole("button", { name: "Löschen", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "2 Positionen löschen?" });
  await expect(dialog.getByRole("button", { name: "Abbrechen" })).toBeFocused();
  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByText("2 ausgewählt")).toBeVisible();

  await page.getByRole("button", { name: "Löschen", exact: true }).click();
  await dialog.getByRole("button", { name: "Löschen" }).evaluate((button) => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await expect(dialog.getByRole("alert")).toContainText("Die Positionen haben sich geändert.");
  await expect(page.getByTestId("position-bulk-attempts")).toHaveAttribute("data-count", "1");
  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByText("2 ausgewählt")).toBeVisible();

  await dialog.getByRole("button", { name: "Löschen" }).click();
  await expect(dialog).toHaveCount(0);
  const preview = page.getByTestId("step2-document-preview");
  await expect(preview).toHaveAttribute("data-preview-position-sequence", "1");
  await expect(preview).toHaveAttribute("data-preview-descriptions", "Anfahrt");
  await expect(page.getByTestId("step2-summary-total")).toHaveText("41,65 €");
  await expect(rows(page)).toHaveCount(1);

  await enterSelection(page);
  await selectRows(page, [0]);
  await page.getByRole("button", { name: "Löschen", exact: true }).click();
  await page.getByRole("dialog", { name: "1 Position löschen?" }).getByRole("button", { name: "Löschen" }).click();
  await expect(rows(page)).toHaveCount(0);
  await expect(preview).toHaveAttribute("data-preview-total-amount", "0");
  await expect(page.getByRole("button", { name: "Weiter" })).toBeDisabled();
  await expect(page.getByTestId("step2-add-position")).toBeVisible();
});

test("Türkische Auswahl und Sammeländerung am Handy", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tr/nachweis-test?view=position-selection");
  await enterSelection(page, "Seç");
  await selectRows(page, [0, 1]);
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "KDV oranını değiştir" }).click();
  const dialog = page.getByRole("dialog", { name: "KDV oranını değiştir" });
  await dialog.getByRole("radio", { name: "0 %", exact: true }).check();
  await dialog.getByRole("button", { name: "KDV uygula" }).click();
  await expect(page.getByTestId("step2-document-preview")).toHaveAttribute("data-preview-tax-rates", "0,0,0");
});

test("Arabische Mehrfachauswahl auf 360 px", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/ar/nachweis-test?view=position-selection");
  await enterSelection(page, "تحديد");
  await selectRows(page, [0, 1]);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expectNoHorizontalOverflow(page);
  const name = rows(page).first().getByTestId("position-name");
  expect(await name.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("ar-auswahl-mobil.png"), style: screenshotStyle });
  await page.getByRole("button", { name: "تعديل الضريبة" }).click();
  const dialog = page.getByRole("dialog", { name: "تعديل الضريبة" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("radio", { name: "7 %", exact: true }).check();
  await page.screenshot({ path: testInfo.outputPath("ar-mwst-mobil.png"), style: screenshotStyle });
  await dialog.getByRole("button", { name: "تطبيق الضريبة" }).click();
  await expect(page.getByTestId("step2-document-preview")).toHaveAttribute("data-preview-tax-rates", "7,7,0");
});
