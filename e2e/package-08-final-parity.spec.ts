import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const DEV_TEST_EMAIL = "zackzack@test.com";
const LONG_ITEM_COUNT = 21;

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

async function openInvoiceStep2(page: Page): Promise<string> {
  await page.goto("/de/dashboard");
  await page.getByRole("button", { name: /Neue Rechnung \/ Angebot/ }).first().click();
  await page.waitForURL(/\/de\/create\/[^/]+\/1$/);
  const documentId = new URL(page.url()).pathname.split("/")[3];
  const customer = page.locator(".dcust:not(.dcust--new)").first();
  await expect(customer).toBeVisible();
  await customer.click();
  await page.locator(".step1-next-button").click();
  await page.waitForURL(new RegExp(`/de/create/${documentId}/2$`));
  return documentId;
}

async function clearPositions(page: Page): Promise<void> {
  const cards = page.locator(".d2card");
  while (await cards.count()) {
    const previousCount = await cards.count();
    await cards.first().getByRole("button", { name: "Löschen" }).click();
    await expect(cards).toHaveCount(previousCount - 1);
  }
}

async function addLongDocument(page: Page): Promise<void> {
  const cards = page.locator(".d2card");
  for (let index = 0; index < LONG_ITEM_COUNT; index += 1) {
    await page.getByRole("button", { name: /Position hinzufügen/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator(".cat-item").first().click();
    await expect(cards).toHaveCount(index + 1);
  }
}

async function countPdfPages(frame: Locator): Promise<number> {
  return frame.evaluate(async (element: HTMLIFrameElement) => {
    const bytes = new Uint8Array(await (await fetch(element.src)).arrayBuffer());
    const source = new TextDecoder("latin1").decode(bytes);
    return source.match(/\/Type\s*\/Page\b/g)?.length ?? 0;
  });
}

async function waitForPdfPreview(page: Page, testId: string): Promise<Locator> {
  const preview = page.getByTestId(testId);
  const frame = page.getByTestId(`${testId}-frame`);
  await expect(preview).toHaveAttribute("dir", "ltr");
  await expect(preview).toHaveAttribute("lang", "de");
  await expect(preview).not.toHaveAttribute("data-render-state", "error");
  // Headless Chromium lädt eingebettete PDF-Blob-URLs als Download; dabei
  // feuert das iframe kein onLoad, obwohl der kanonische PDF-Blob vorliegt.
  await expect(frame).toHaveAttribute("src", /^blob:/);
  return frame;
}

async function inspectPdf(bytes: Uint8Array): Promise<{
  pageCount: number;
  pageTexts: string[];
  pageSizes: Array<{ width: number; height: number }>;
  text: string;
}> {
  const task = getDocument({ data: Uint8Array.from(bytes) });
  const pdf = await task.promise;
  const pageTexts: string[] = [];
  const pageSizes: Array<{ width: number; height: number }> = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const pdfPage = await pdf.getPage(pageNumber);
    pageSizes.push({
      width: pdfPage.view[2] - pdfPage.view[0],
      height: pdfPage.view[3] - pdfPage.view[1],
    });
    const content = await pdfPage.getTextContent();
    pageTexts.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    );
  }
  await task.destroy();
  return { pageCount: pdf.numPages, pageTexts, pageSizes, text: pageTexts.join(" ") };
}

test("Paket 8: Vorschau, Download und Archiv nutzen denselben Renderer", async ({
  page,
}) => {
  test.setTimeout(480_000);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await loginWithLocalDevAccount(page);
  const documentId = await openInvoiceStep2(page);
  await clearPositions(page);
  await addLongDocument(page);

  await expect(page.getByTestId("step2-document-preview")).toHaveAttribute(
    "data-preview-position-count",
    String(LONG_ITEM_COUNT),
  );
  const companyName = (await page.getByTestId("step2-preview-company").textContent())?.trim();
  expect(companyName).toBeTruthy();
  const step2Frame = await waitForPdfPreview(page, "step2-pdf-preview");
  await expect.poll(() => countPdfPages(step2Frame)).toBeGreaterThan(1);
  const step2Pages = await countPdfPages(step2Frame);

  await page.locator(".d2-sum-btn").click();
  await page.waitForURL(new RegExp(`/de/create/${documentId}/3$`));
  const step3Frame = await waitForPdfPreview(page, "step3-pdf-preview");
  await expect.poll(() => countPdfPages(step3Frame)).toBe(step2Pages);

  const finalizeButton = page.getByRole("button", { name: "Jetzt abschließen" });
  await expect(finalizeButton).toBeEnabled();
  await finalizeButton.click();
  const finalizeDialog = page.getByRole("dialog");
  await finalizeDialog.getByRole("button", { name: "Abschließen", exact: true }).click();
  await expect(page.locator(".share-success")).toBeVisible();
  await expect(page.locator(".share-success-s")).toContainText(/R-\d{4}-\d{3,}/);

  const finalizedFrame = await waitForPdfPreview(page, "step3-pdf-preview");
  await expect.poll(() => countPdfPages(finalizedFrame)).toBe(step2Pages);

  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Speichern" }).click();
  const download = await downloadEvent;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const downloadedPdf = await readFile(downloadPath as string);
  expect(downloadedPdf.byteLength).toBeGreaterThan(1_000);
  expect(downloadedPdf.subarray(0, 5).toString()).toBe("%PDF-");

  const parsed = await inspectPdf(downloadedPdf);
  expect(parsed.pageCount).toBe(step2Pages);
  for (const pageSize of parsed.pageSizes) {
    expect(pageSize.width).toBeCloseTo(595.28, 1);
    expect(pageSize.height).toBeCloseTo(841.89, 1);
    expect(pageSize.height / pageSize.width).toBeCloseTo(297 / 210, 3);
  }
  expect(parsed.text).toContain("Rechnung");
  expect(parsed.text.match(/Anfahrt/g)).toHaveLength(LONG_ITEM_COUNT);
  expect(parsed.text).toContain("Gesamt (netto)");
  for (const pageText of parsed.pageTexts.slice(0, -1)) {
    expect(pageText).toContain("Zwischensumme");
    expect(pageText).not.toContain("Gesamt (netto)");
  }
  expect(parsed.pageTexts.at(-1)).not.toContain("Zwischensumme");
  expect(parsed.pageTexts.at(-1)).toContain("Gesamt (netto)");
  expect(parsed.text).not.toMatch(/Einkaufspreis|Aufschlag|Marge/i);
  for (const pageText of parsed.pageTexts) {
    expect(pageText).toContain("Bezeichnung");
    expect(pageText).toContain("Einzelpreis");
    expect(pageText).toContain("Kontakt");
    expect(pageText).toContain("Bank & Steuer");
    expect(pageText).toContain(companyName as string);
  }

  for (const [locale, uiTitle, direction] of [
    ["de", "Rechnung erstellen", "ltr"],
    ["tr", "Fatura oluştur", "ltr"],
    ["ar", "إنشاء فاتورة", "rtl"],
  ] as const) {
    await page.goto(`/${locale}/create/${documentId}/3`);
    await expect(page.locator(".dflow-title")).toHaveText(uiTitle);
    await expect(page.locator(".dapp")).toHaveAttribute("dir", direction);
    const localizedFrame = await waitForPdfPreview(page, "step3-pdf-preview");
    await expect.poll(() => countPdfPages(localizedFrame)).toBe(step2Pages);
  }

  const archivedResponse = await page.request.get(`/api/documents/${documentId}/pdf`);
  expect(archivedResponse.ok()).toBe(true);
  expect(archivedResponse.headers()["content-type"]).toContain("application/pdf");
  const archivedPdf = await archivedResponse.body();
  expect(archivedPdf.byteLength).toBeGreaterThan(1_000);
  const archivedParsed = await inspectPdf(archivedPdf);
  expect(archivedParsed.pageCount).toBe(step2Pages);
  expect(archivedParsed.text).toContain("Rechnung");
  expect(archivedParsed.pageSizes).toEqual(parsed.pageSizes);
  expect(archivedParsed.pageTexts).toEqual(parsed.pageTexts);

  expect(consoleErrors).toEqual([]);
});
