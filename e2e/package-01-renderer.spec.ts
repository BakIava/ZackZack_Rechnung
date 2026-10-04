import { expect, test, type Page } from "@playwright/test";

const DEV_TEST_EMAIL = "zackzack@test.com";

function countPdfPages(bytes: Uint8Array): number {
  const source = Buffer.from(bytes).toString("latin1");
  return source.match(/\/Type\s*\/Page\b/g)?.length ?? 0;
}

async function loginWithLocalDevAccount(page: Page): Promise<void> {
  await page.goto("/de/login");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.getByLabel("E-Mail-Adresse").fill(DEV_TEST_EMAIL);
  await page.getByRole("button", { name: "Code anfordern" }).click();
  const digits = page.locator(".lg-cell");
  await expect(digits).toHaveCount(6);
  for (let index = 0; index < 6; index += 1) {
    await digits.nth(index).fill("1");
  }
  await page.waitForURL(/\/(dashboard|setup)$/);
}

async function countPdfPagesAtBlobUrl(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate(async (frame: HTMLIFrameElement) => {
    if (!frame.src.startsWith("blob:")) return 0;
    const bytes = new Uint8Array(await (await fetch(frame.src)).arrayBuffer());
    const source = new TextDecoder("latin1").decode(bytes);
    return source.match(/\/Type\s*\/Page\b/g)?.length ?? 0;
  });
}

async function readPdfAtBlobUrl(page: Page, selector: string): Promise<Buffer> {
  const bytes = await page.locator(selector).evaluate(async (frame: HTMLIFrameElement) => {
    const data = new Uint8Array(await (await fetch(frame.src)).arrayBuffer());
    return Array.from(data);
  });
  return Buffer.from(bytes);
}

test("Paket 1: Browser- und Server-Renderer", async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await loginWithLocalDevAccount(page);
  await page.goto("/de/renderer-spike");

  await expect(page.getByTestId("renderer-harness")).toBeVisible();
  await expect(page.getByTestId("glyph-evidence")).toContainText(
    "Straße · Größe · Jürgen · Yılmaz · İstanbul · ş · ğ · ı",
  );
  await expect(page.getByTestId("logo-fallback")).toContainText("YG");

  const singleViewer = page.getByTestId("single-pdf-viewer");
  await expect(singleViewer).toHaveAttribute("src", /^blob:/);
  await expect
    .poll(() => countPdfPagesAtBlobUrl(page, '[data-testid="single-pdf-viewer"]'))
    .toBe(1);

  const multiViewer = page.getByTestId("multi-pdf-viewer");
  await expect(multiViewer).toHaveAttribute("src", /^blob:/);
  const initialMultiUrl = await multiViewer.getAttribute("src");
  await expect
    .poll(() => countPdfPagesAtBlobUrl(page, '[data-testid="multi-pdf-viewer"]'))
    .toBeGreaterThan(1);
  const browserMultiPages = await countPdfPagesAtBlobUrl(
    page,
    '[data-testid="multi-pdf-viewer"]',
  );
  await expect(page.getByTestId("multi-render-status")).toContainText("Gerenderte Seiten");

  await page.getByTestId("update-price").click();
  await expect(page.getByTestId("current-price")).toContainText("135,00");
  await expect
    .poll(() => multiViewer.getAttribute("src"))
    .not.toBe(initialMultiUrl);

  const browserMultiPdf = await readPdfAtBlobUrl(
    page,
    '[data-testid="multi-pdf-viewer"]',
  );
  await testInfo.attach("react-pdf-browser-multi.pdf", {
    body: browserMultiPdf,
    contentType: "application/pdf",
  });
  await testInfo.attach("renderer-harness.png", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  const serverSingleResponse = await page.request.get(
    "/api/renderer-spike/pdf?variant=single",
  );
  const serverMultiResponse = await page.request.get(
    "/api/renderer-spike/pdf?variant=multi",
  );
  expect(serverSingleResponse.ok()).toBe(true);
  expect(serverMultiResponse.ok()).toBe(true);
  const serverSinglePdf = await serverSingleResponse.body();
  const serverMultiPdf = await serverMultiResponse.body();
  expect(countPdfPages(serverSinglePdf)).toBe(1);
  expect(countPdfPages(serverMultiPdf)).toBe(browserMultiPages);
  await testInfo.attach("react-pdf-server-multi.pdf", {
    body: serverMultiPdf,
    contentType: "application/pdf",
  });

  await testInfo.attach("renderer-metrics.json", {
    body: Buffer.from(JSON.stringify({
      browserReactPdfPages: browserMultiPages,
      serverReactPdfPages: countPdfPages(serverMultiPdf),
    }, null, 2)),
    contentType: "application/json",
  });
  expect(consoleErrors).toEqual([]);
});
