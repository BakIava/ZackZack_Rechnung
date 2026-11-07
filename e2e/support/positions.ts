import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Positionen in Schritt 2 sind zugeklappt (kompakte Zeile); höchstens eine ist
 * zum Bearbeiten aufgeklappt. Felder und „Löschen" gibt es nur aufgeklappt.
 */
export async function expandPosition(card: Locator): Promise<void> {
  if ((await card.getAttribute("data-expanded")) !== "1") {
    await card.locator(".d2row-toggle").click();
  }
  await expect(card).toHaveAttribute("data-expanded", "1");
}

/** Löscht genau diese Position. */
export async function deletePosition(card: Locator): Promise<void> {
  await expandPosition(card);
  await card.getByRole("button", { name: "Löschen" }).click();
}

/** Leert den Entwurf – von oben nach unten. */
export async function deleteAllPositions(page: Page): Promise<void> {
  const cards = page.locator(".d2card");
  while (await cards.count()) {
    const count = await cards.count();
    await deletePosition(cards.first());
    await expect(cards).toHaveCount(count - 1);
  }
}
