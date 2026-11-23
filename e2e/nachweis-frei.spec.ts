import { expect, test, type Locator, type Page } from "@playwright/test";

async function upload(page: Page, name = "kalender.pdf", content = "%PDF-1.7 synthetic") {
  await page.locator('input[type="file"]').setInputFiles({
    name, mimeType: "application/pdf", buffer: Buffer.from(content),
  });
}

async function oeffneZeile(zeile: Locator) {
  const schalter = zeile.getByTestId("freie-zeile-toggle");
  if (await schalter.getAttribute("aria-expanded") !== "true") await schalter.click();
  await expect(schalter).toHaveAttribute("aria-expanded", "true");
}

async function waehleEinheit(trigger: Locator, einheit: string) {
  await trigger.click();
  const menu = trigger.locator("..").locator(".unit-picker-popover");
  await expect(menu).toBeInViewport({ ratio: 0.99 });
  await menu.getByRole("option", { name: einheit, exact: true }).click();
  await expect(trigger).toHaveText(einheit);
}

async function pruefeKeinHorizontalesScrollen(page: Page) {
  expect(await page.locator(".dmodal-body").evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(1);
}

const screenshotStyle = "nextjs-portal { display: none; }";

test("Arabisch mobil: lange deutsche Texte, Tastatur, Ziffern und Prüffehler", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/ar/nachweis-test?import=fail-once");
  await expect(page.getByTestId("nachweis-test-harness")).toBeVisible();
  await upload(page);
  const zeilen = page.getByTestId("freie-zeile");
  await expect(zeilen).toHaveCount(5);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("dialog").locator("..")).toHaveAttribute("dir", "rtl");
  await expect(zeilen.locator("textarea")).toHaveCount(0);
  await oeffneZeile(zeilen.nth(1));
  await oeffneZeile(zeilen.first());
  await expect(zeilen.nth(1).getByTestId("freie-zeile-toggle")).toHaveAttribute("aria-expanded", "false");
  await expect(zeilen.locator("textarea")).toHaveCount(1);
  const beschreibung = zeilen.first().getByLabel("النص على المستند");
  await expect(beschreibung).toHaveAttribute("dir", "ltr");
  await expect(beschreibung).toHaveAttribute("lang", "de");
  await beschreibung.fill("Sanierung und vollständige Abdichtung des mehrteiligen Bodenaufbaus im Treppenhaus");
  const ersteMenge = zeilen.first().getByLabel("الكمية", { exact: true });
  const ersteEinheit = zeilen.first().getByLabel("الوحدة", { exact: true });
  const ersterPreis = zeilen.first().getByLabel("سعر الوحدة قبل الضريبة (€)");
  await ersteMenge.focus();
  await page.keyboard.press("Tab");
  await expect(ersteEinheit).toBeFocused();
  await waehleEinheit(ersteEinheit, "Std.");
  await expect(ersteEinheit).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(ersterPreis).toBeFocused();
  await pruefeKeinHorizontalesScrollen(page);
  await page.screenshot({ path: testInfo.outputPath("ar-mobil-felder.png"), style: screenshotStyle });

  const importButton = page.getByRole("dialog").getByRole("button", { name: "إضافة", exact: true });
  await expect(importButton).toBeDisabled();
  await expect(zeilen.getByLabel("أيام العمل (اختياري)")).toHaveCount(0);
  await expect(page.locator(".nachweis-stunden-hinweis")).toHaveCount(0);
  await expect(zeilen.getByRole("checkbox")).toHaveCount(0);
  await zeilen.last().getByRole("button", { name: "حذف البند" }).click();
  await zeilen.last().getByRole("button", { name: "حذف البند" }).click();
  await expect(zeilen).toHaveCount(3);
  for (const zeile of await zeilen.all()) {
    await oeffneZeile(zeile);
    await zeile.getByLabel("سعر الوحدة قبل الضريبة (€)").fill("٤٨٫٥٠");
  }
  await expect(importButton).toBeEnabled();
  await importButton.click();
  await expect(page.getByText("تعذّر إضافة البنود.", { exact: false })).toBeVisible();
  await expect(page.getByRole("dialog").locator(".nachweis-result-list li")).toHaveCount(3);
  await expect(page.getByText("13.11.2026", { exact: true })).toBeVisible();
  await pruefeKeinHorizontalesScrollen(page);
  await page.locator(".nachweis-review-import").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("ar-mobil-importfehler.png"), style: screenshotStyle });
  await importButton.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const importiert = page.getByTestId("imported-lines");
  await expect(importiert).not.toContainText("Anfahrt");
  await expect(importiert).not.toContainText("Mauerstein");
  expect(JSON.parse(await importiert.textContent() ?? "[]")).toHaveLength(3);
});

test("Türkisch: Mengenposition und Pauschale prüfen und übernehmen", async ({ page }, testInfo) => {
  await page.goto("/tr/nachweis-test");
  await upload(page, "abrechnung.pdf");
  const zeilen = page.getByTestId("freie-zeile");
  await expect(zeilen).toHaveCount(3);
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  for (const zeile of await zeilen.all()) {
    await oeffneZeile(zeile);
    await zeile.getByLabel("Net birim fiyatı (€)").fill("23,50");
  }
  await waehleEinheit(zeilen.nth(2).getByLabel("Birim", { exact: true }), "lfm");
  const button = page.getByRole("dialog").getByRole("button", { name: "Ekle", exact: true });
  await expect(button).toBeEnabled();
  await pruefeKeinHorizontalesScrollen(page);
  await button.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("tr-desktop.png"), style: screenshotStyle });
  await button.click();
  await expect(page.getByTestId("imported-lines")).toContainText("Pauschale");
});

test("Nachweis nutzt die Einheiten der freien Position und behält erkannte Sonderwerte", async ({ page }) => {
  await page.goto("/de/nachweis-test");
  await page.getByRole("tab", { name: "Freie Position" }).click();
  await page.getByLabel("Einheit", { exact: true }).click();
  const optionen = page.getByRole("option");
  await expect(optionen.first()).toHaveText("m²");
  const standard = await optionen.allTextContents();

  await page.getByRole("tab", { name: "Nachweis", exact: true }).click();
  await upload(page, "abrechnung.pdf");
  const zeile = page.getByTestId("freie-zeile").nth(2);
  await oeffneZeile(zeile);
  const einheit = zeile.getByLabel("Einheit", { exact: true });
  await expect(einheit).toHaveText("Auswählen");
  await einheit.click();
  await expect(optionen).toHaveText(standard);
  await page.getByRole("searchbox", { name: "Einheit suchen …" }).fill("m2");
  await expect(optionen).toHaveText(["m²"]);
  await optionen.first().click();
  await expect(einheit).toHaveText("m²");

  await page.getByRole("button", { name: "Andere Datei" }).click();
  await upload(page, "material.pdf", "%PDF-1.7 synthetic material");
  const material = page.getByTestId("freie-zeile");
  await oeffneZeile(material);
  const materialEinheit = material.getByLabel("Einheit", { exact: true });
  await expect(materialEinheit).toHaveText("Sack");
  await waehleEinheit(materialEinheit, "Stk.");
  await waehleEinheit(materialEinheit, "Sack");
});

async function freieEingaben(page: Page) {
  const zeilen = page.getByTestId("freie-zeile");
  await expect(zeilen).toHaveCount(5);
  await expect(zeilen.getByLabel("Arbeitstage (optional)")).toHaveCount(0);
  await expect(page.getByText("Die Summe stimmt mit dem Blatt überein.", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Bitte prüfen:", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Ergänze Text, Menge, Einheit und Preis.", { exact: false })).toHaveCount(0);
  await expect(zeilen.getByRole("checkbox")).toHaveCount(0);
  for (const zeile of await zeilen.all()) {
    await oeffneZeile(zeile);
    await zeile.getByLabel("Netto-Einzelpreis (€)").fill("48,00");
  }
  await oeffneZeile(zeilen.nth(3));
  await zeilen.nth(3).getByLabel("Menge", { exact: true }).fill("1");
  await waehleEinheit(zeilen.nth(3).getByLabel("Einheit", { exact: true }), "Stk.");
}

test("Serverfehler behält Eingaben, ein Doppelklick sendet einmal, Erfolg enthält alle Positionen", async ({ page }, testInfo) => {
  await page.goto("/de/nachweis-test?import=fail-once");
  await upload(page);
  await freieEingaben(page);
  const uebernehmen = page.getByRole("button", { name: "Übernehmen", exact: true });
  await expect(uebernehmen).toBeEnabled();
  await pruefeKeinHorizontalesScrollen(page);
  await uebernehmen.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("de-desktop.png"), style: screenshotStyle });
  await uebernehmen.evaluate((node) => {
    node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  const result = page.getByTestId("imported-lines");
  await expect(result).toHaveAttribute("data-attempts", "1");
  await expect(page.getByText("Die Positionen wurden nicht übernommen.", { exact: false })).toBeVisible();
  await expect(page.getByTestId("freie-zeile").nth(3).getByLabel("Einheit", { exact: true })).toHaveText("Stk.");
  const erste = page.getByTestId("freie-zeile").first();
  await oeffneZeile(erste);
  await expect(erste.getByLabel("Netto-Einzelpreis (€)")).toHaveValue("48");
  await uebernehmen.click();
  await expect(result).toHaveAttribute("data-attempts", "2");
  await expect(result).toContainText("Mauerstein 7,5 cm");
  expect(JSON.parse(await result.textContent() ?? "[]")).toHaveLength(5);
});

test("Netzwerkfehler ohne bestätigten Ausgang erfordert Prüfung vor erneutem Import", async ({ page }) => {
  await page.goto("/de/nachweis-test?import=unknown");
  await upload(page);
  await freieEingaben(page);
  const uebernehmen = page.getByRole("button", { name: "Übernehmen", exact: true });
  await uebernehmen.click();
  await expect(page.getByText("Die Übernahme konnte nicht bestätigt werden.", { exact: false })).toBeVisible();
  await expect(uebernehmen).toBeDisabled();
  await expect(page.getByTestId("imported-lines")).toHaveAttribute("data-attempts", "1");
});

test("Tabwechsel während der Lesung verwirft die verspätete Antwort", async ({ page }) => {
  await page.goto("/de/nachweis-test");
  await upload(page, "langsam.pdf");
  await expect(page.getByText("Nachweis wird gelesen …")).toBeVisible();
  await page.getByRole("tab", { name: "Freie Position" }).click();
  await page.getByRole("tab", { name: "Nachweis", exact: true }).click();
  await upload(page, "tabelle.pdf", "%PDF-1.7 table fixture");
  await expect(page.getByText("Nachweis TEST-42", { exact: true })).toBeVisible();
  await expect(page.getByText("Achtung: Nachweis TEST-42 wurde schon übernommen", { exact: false })).toBeVisible();
  await expect(page.getByTestId("imported-lines")).toHaveAttribute("data-reads", "2");
  await expect(page.getByTestId("freie-zeile")).toHaveCount(0);
});

test("Tabellenreview behält Warnung, Korrektur und gemerkten Mitarbeiterpreis", async ({ page }, testInfo) => {
  await page.goto("/de/nachweis-test");
  await upload(page, "tabelle.pdf", "%PDF-1.7 table");
  const stunden = page.getByLabel("Stunden von Testkraft A");
  await expect(stunden).toHaveAttribute("data-unsure", "1");
  await expect(page.getByText("Auf dem Zettel steht Gesamt", { exact: false })).toBeVisible();
  await expect(page.getByText("Achtung: Nachweis TEST-42 wurde schon übernommen", { exact: false })).toBeVisible();
  await stunden.fill("7");
  await expect(stunden).toHaveAttribute("data-unsure", "0");
  await expect(page.getByText("Auf dem Zettel steht Gesamt", { exact: false })).toHaveCount(0);
  await page.getByLabel("Stundenpreis für Testkraft A").fill("43.50");
  await page.screenshot({ path: testInfo.outputPath("de-tabelle.png"), style: screenshotStyle });
  await page.getByRole("button", { name: "Übernehmen", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const ausgabe = page.getByTestId("imported-lines");
  expect(JSON.parse(await ausgabe.textContent() ?? "[]")).toEqual([{
    kind: "free", descriptionDe: "Tore einstellen", amount: 7, unit: "Std.", unitPrice: 4350,
    additionalDescriptionDe: "lt. Stundennachweis Nr. TEST-42, 09.11.2026",
  }]);
  await page.getByTestId("step2-add-nachweis").click();
  await upload(page, "tabelle.pdf", "%PDF-1.7 second table");
  await expect(page.getByLabel("Stundenpreis für Testkraft A")).toHaveValue("43.5");
});

test("Cache-Wiederöffnung und bewusstes Neulesen mit fehlgeschlagenem Versuch", async ({ page }, testInfo) => {
  await page.goto("/de/nachweis-test");
  await upload(page);
  const zeilen = page.getByTestId("freie-zeile");
  await expect(zeilen).toHaveCount(5);
  const preis = zeilen.first().getByLabel("Netto-Einzelpreis (€)");
  await oeffneZeile(zeilen.first());
  await preis.fill("42,50");
  await zeilen.nth(3).getByRole("button", { name: "Zeile entfernen" }).click();
  await expect(zeilen).toHaveCount(4);
  await page.getByRole("button", { name: "Leistung hinzufügen" }).click();
  await expect(zeilen).toHaveCount(5);
  await expect(zeilen.last().getByTestId("freie-zeile-toggle")).toHaveAttribute("aria-expanded", "true");
  const ausgabe = page.getByTestId("imported-lines");
  await expect(ausgabe).toHaveAttribute("data-reads", "1");
  await page.getByRole("button", { name: "Andere Datei" }).click();
  await upload(page);
  await expect(page.getByText("Aus dem Speicher geöffnet")).toBeVisible();
  await expect(ausgabe).toHaveAttribute("data-reads", "1");
  await oeffneZeile(zeilen.first());
  await expect(preis).toHaveValue("42,5");
  await page.getByRole("button", { name: "Andere Datei" }).click();
  await page.getByRole("button", { name: "Nachweis ohne Nummer" }).click();
  await expect(zeilen.getByText("Mauerstein 7,5 cm", { exact: true })).toHaveCount(0);
  await expect(zeilen.locator("textarea")).toHaveCount(0);
  await page.getByRole("button", { name: "Leistung hinzufügen" }).click();
  await expect(zeilen).toHaveCount(6);
  await page.getByRole("button", { name: "Neu lesen" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("de-cache.png"), style: screenshotStyle });
  await page.getByRole("button", { name: "Neu lesen" }).click();
  await upload(page, "defekt.pdf");
  await expect(page.getByText("Der Nachweis konnte nicht gelesen werden.", { exact: false })).toBeVisible();
  await expect(ausgabe).toHaveAttribute("data-reads", "2");
  await page.getByRole("button", { name: "Nachweis ohne Nummer" }).click();
  await expect(zeilen).toHaveCount(6);
  await oeffneZeile(zeilen.first());
  await expect(preis).toHaveValue("42,5");
  await page.getByRole("button", { name: "Neu lesen" }).click();
  await upload(page);
  await expect(ausgabe).toHaveAttribute("data-reads", "3");
  await expect(zeilen.locator("textarea")).toHaveCount(0);
  await oeffneZeile(zeilen.first());
  await expect(preis).toHaveValue("");
  await expect(zeilen).toHaveCount(5);
});

test("Ungültige Datei und leere Extraktion zeigen einen manuellen Ausweg", async ({ page }) => {
  await page.goto("/de/nachweis-test");
  await upload(page, "ungültig.pdf", "falsche Dateisignatur");
  await expect(page.getByText("Diese Datei können wir nicht lesen.", { exact: false })).toBeVisible();
  await upload(page, "leer.pdf");
  await expect(page.getByText("Auf dem Blatt haben wir keine Stunden oder Leistungen erkannt.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Manuell erfassen" }).click();
  await expect(page.getByRole("tab", { name: "Freie Position" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".nachweis-upload")).toHaveCount(0);
});

test("Mehr als 20 Zeilen bleiben sichtbar und sperren die Übernahme bis zur Löschung", async ({ page }) => {
  await page.goto("/de/nachweis-test");
  await upload(page, "viele.pdf");
  const zeilen = page.getByTestId("freie-zeile");
  await expect(zeilen).toHaveCount(21);
  await expect(page.getByText("Höchstens 20 Positionen pro Übernahme. Entferne überzählige Zeilen.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Übernehmen", exact: true })).toBeDisabled();
  await zeilen.last().getByRole("button", { name: "Zeile entfernen" }).click();
  await expect(zeilen).toHaveCount(20);
  await expect(page.getByText("Höchstens 20 Positionen pro Übernahme. Entferne überzählige Zeilen.")).toHaveCount(0);
  await expect(page.locator(".nachweis-result-list li")).toHaveCount(20);
});
