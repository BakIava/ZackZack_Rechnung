import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  insertService: vi.fn(),
  updateService: vi.fn(),
  deleteService: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@/lib/repositories/services", () => ({
  insertService: h.insertService,
  updateService: h.updateService,
  deleteService: h.deleteService,
}));

import { createService, deleteService, updateService } from "./actions";

const input = { description_de: "Wand streichen", unit: "m²" };

beforeEach(() => {
  vi.clearAllMocks();
  h.insertService.mockResolvedValue({ id: "service-1" });
  h.updateService.mockResolvedValue({});
  h.deleteService.mockResolvedValue({});
});

describe("Katalog-Invalidierung", () => {
  it("invalidiert das permanente Layout nach dem Anlegen", async () => {
    await expect(createService(input)).resolves.toEqual({ id: "service-1" });
    expect(h.revalidatePath).toHaveBeenCalledWith("/[locale]/(app)", "layout");
  });

  it("invalidiert das permanente Layout nach dem Löschen", async () => {
    await expect(deleteService("service-1")).resolves.toEqual({});
    expect(h.revalidatePath).toHaveBeenCalledWith("/[locale]/(app)", "layout");
  });

  it("invalidiert weder bei Fehlern noch bei mengenneutralen Updates", async () => {
    h.insertService.mockResolvedValue({ error: "db_error" });

    await createService(input);
    await updateService("service-1", input);

    expect(h.revalidatePath).not.toHaveBeenCalled();
  });
});
