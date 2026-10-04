import { expect, test, type Locator, type Page } from "@playwright/test";

const DEV_TEST_EMAIL = "zackzack@test.com";
const MULTI_PAGE_ITEM_COUNT = 9;

test.use({ viewport: { width: 1280, height: 900 } });

interface LayoutGeometry {
  appHasHorizontalOverflow: boolean;
  rootHasHorizontalOverflow: boolean;
  sidebarWidth: number;
  positionsInlineStart: number;
  positionsInlineEnd: number;
  documentInlineStart: number;
  documentInlineEnd: number;
  documentWidth: number;
  previewAspectRatio: number;
  frameInlineStart: number;
  frameInlineEnd: number;
  frameWidth: number;
  positionsScrollable: boolean;
  positionsOverflowY: string;
  documentOverflowY: string;
}

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

async function openStep2(page: Page): Promise<string> {
  await page.goto("/de/dashboard");
  await page.getByRole("button", { name: /Neue Rechnung \/ Angebot/ }).first().click();
  await page.waitForURL(/\/de\/create\/[^/]+\/1$/);
  const customer = page.locator(".dcust:not(.dcust--new)").first();
  await expect(customer).toBeVisible();
  await customer.click();
  await page.locator(".step1-next-button").click();
  await page.waitForURL(/\/de\/create\/[^/]+\/2$/);
  return new URL(page.url()).pathname.split("/")[3];
}

async function clearPositions(page: Page): Promise<void> {
  const cards = page.locator(".d2card");
  while (await cards.count()) {
    const previousCount = await cards.count();
    await cards.first().getByRole("button", { name: "Löschen" }).click();
    await expect(cards).toHaveCount(previousCount - 1);
  }
}

async function addCatalogPositions(page: Page): Promise<void> {
  const cards = page.locator(".d2card");
  for (let index = 0; index < MULTI_PAGE_ITEM_COUNT; index += 1) {
    await page.getByRole("button", { name: /Position hinzufügen/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const firstCatalogItem = dialog.locator(".cat-item").first();
    await expect(firstCatalogItem).toBeVisible();
    await firstCatalogItem.click();
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

async function readGeometry(page: Page): Promise<LayoutGeometry> {
  return page.evaluate(() => {
    const required = (selector: string): HTMLElement => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing layout element: ${selector}`);
      return element;
    };
    const app = required(".dapp");
    const sidebar = required('[data-testid="app-sidebar"]');
    const positions = required('[data-testid="step2-positions-column"]');
    const documentColumn = required('[data-testid="step2-document-column"]');
    const preview = required('[data-testid="step2-pdf-preview"]');
    const frame = required('[data-testid="step2-pdf-preview-frame"]');
    const sidebarBox = sidebar.getBoundingClientRect();
    const positionsBox = positions.getBoundingClientRect();
    const documentBox = documentColumn.getBoundingClientRect();
    const previewBox = preview.getBoundingClientRect();
    const frameBox = frame.getBoundingClientRect();

    return {
      appHasHorizontalOverflow: app.scrollWidth > app.clientWidth,
      rootHasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      sidebarWidth: sidebarBox.width,
      positionsInlineStart: positionsBox.left,
      positionsInlineEnd: positionsBox.right,
      documentInlineStart: documentBox.left,
      documentInlineEnd: documentBox.right,
      documentWidth: documentBox.width,
      previewAspectRatio: previewBox.height / previewBox.width,
      frameInlineStart: frameBox.left,
      frameInlineEnd: frameBox.right,
      frameWidth: frameBox.width,
      positionsScrollable: positions.scrollHeight > positions.clientHeight,
      positionsOverflowY: getComputedStyle(positions).overflowY,
      documentOverflowY: getComputedStyle(documentColumn).overflowY,
    };
  });
}

async function expectSummaryAfterPositions(page: Page): Promise<void> {
  const summary = page.locator(".d2-sumpanel");
  const lastCard = page.locator(".d2card").last();
  await expect(summary).toBeAttached();
  const followsCards = await summary.evaluate((element, lastCardElement) => {
    if (!lastCardElement) return false;
    return Boolean(lastCardElement.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
  }, await lastCard.elementHandle());
  expect(followsCards).toBe(true);
}

async function expectDesktopLayout(page: Page, direction: "ltr" | "rtl"): Promise<void> {
  const geometry = await readGeometry(page);
  expect(geometry.sidebarWidth).toBeGreaterThanOrEqual(74);
  expect(geometry.sidebarWidth).toBeLessThanOrEqual(78);
  expect(geometry.appHasHorizontalOverflow).toBe(false);
  expect(geometry.rootHasHorizontalOverflow).toBe(false);
  expect(geometry.documentWidth).toBeGreaterThanOrEqual(590);
  expect(geometry.previewAspectRatio).toBeCloseTo(297 / 210, 2);
  expect(geometry.frameWidth).toBeGreaterThanOrEqual(550);
  expect(geometry.frameInlineStart).toBeGreaterThanOrEqual(geometry.documentInlineStart);
  expect(geometry.frameInlineEnd).toBeLessThanOrEqual(geometry.documentInlineEnd);
  expect(geometry.positionsScrollable).toBe(true);
  expect(geometry.positionsOverflowY).toBe("auto");
  expect(geometry.documentOverflowY).toBe("auto");
  if (direction === "ltr") {
    expect(geometry.positionsInlineEnd).toBeLessThan(geometry.documentInlineStart);
  } else {
    expect(geometry.documentInlineEnd).toBeLessThan(geometry.positionsInlineStart);
  }
}

async function waitForDocument(page: Page): Promise<Locator> {
  const preview = page.getByTestId("step2-pdf-preview");
  const frame = page.getByTestId("step2-pdf-preview-frame");
  await expect(preview).not.toHaveAttribute("data-render-state", "error");
  await expect(frame).toHaveAttribute("src", /^blob:/);
  await expect(frame).toHaveAttribute("src", /view=FitH/);
  await expect.poll(() => countPdfPages(frame)).toBeGreaterThan(1);
  // Headless Chromium lädt PDF-Blob-iFrames herunter und feuert kein onLoad.
  // Den dadurch dauerhaft sichtbaren Ladeindikator aus dem Layout-Snapshot nehmen.
  await page.addStyleTag({ content: ".document-pdf-preview__loading-overlay { display: none !important; }" });
  return frame;
}

test("Paket 6: Schritt 2 bleibt bei 1280 px in Deutsch und Arabisch nutzbar", async ({ page }) => {
  test.setTimeout(240_000);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await loginWithLocalDevAccount(page);
  const documentId = await openStep2(page);
  await clearPositions(page);

  try {
    await addCatalogPositions(page);
    await expect(page.getByTestId("app-sidebar")).toHaveAttribute("data-collapsed", "true");
    await expect(page.getByTestId("step2-document-preview")).toHaveAttribute(
      "data-preview-position-count",
      String(MULTI_PAGE_ITEM_COUNT),
    );
    await expect(page.getByTestId("step2-document-preview")).toHaveAttribute(
      "data-preview-descriptions",
      /Anfahrt/,
    );
    await waitForDocument(page);
    await expect(page.getByTestId("step2-pdf-preview")).toHaveAttribute("dir", "ltr");
    await expect(page.getByTestId("step2-pdf-preview")).toHaveAttribute("lang", "de");
    await expectSummaryAfterPositions(page);
    await expectDesktopLayout(page, "ltr");
    await page.locator(".d2-positions").evaluate((element) => { element.scrollTop = 0; });
    await expect(page).toHaveScreenshot("package-06-step2-de.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 150,
    });

    await page.goto(`/ar/create/${documentId}/2`);
    await expect(page.locator(".dapp")).toHaveAttribute("dir", "rtl");
    await expect(page.getByTestId("app-sidebar")).toHaveAttribute("data-collapsed", "true");
    await waitForDocument(page);
    await expect(page.getByTestId("step2-document-preview")).toHaveAttribute(
      "data-preview-descriptions",
      /Anfahrt/,
    );
    await expect(page.getByTestId("step2-pdf-preview")).toHaveAttribute("dir", "ltr");
    await expect(page.getByTestId("step2-pdf-preview")).toHaveAttribute("lang", "de");
    await expectSummaryAfterPositions(page);
    await expectDesktopLayout(page, "rtl");
    await page.locator(".d2-positions").evaluate((element) => { element.scrollTop = 0; });
    await expect(page).toHaveScreenshot("package-06-step2-ar.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 150,
    });
  } finally {
    await page.goto(`/de/create/${documentId}/2`);
    await clearPositions(page);
  }

  expect(consoleErrors).toEqual([]);
});
