import { describe, expect, it, vi } from "vitest";
import { EMPTY_CUSTOMER_INTAKE } from "./customer-intake";
import { processCustomerIntake } from "./customer-intake-service";
import type {
  CustomerAddressCandidate,
  CustomerIntakeData,
} from "@/types/customer-intake";

const customer: CustomerIntakeData = {
  ...EMPTY_CUSTOMER_INTAKE,
  customer_type: "private",
  firstname: "Max",
  lastname: "Mustermann",
  street: "Hauptstraße",
  city: "Mainz",
};

const address: CustomerAddressCandidate = {
  id: "address-1",
  street: "Hauptstraße",
  street_no: null,
  postcode: "55116",
  city: "Mainz",
  formatted_address: "Hauptstraße, 55116 Mainz, Deutschland",
};

function dependencies(extracted: CustomerIntakeData = customer) {
  return {
    consumeCustomerAiQuota: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 9,
      dailyLimit: 10,
    }),
    extractCustomerData: vi.fn().mockResolvedValue(extracted),
    geocodeCustomerAddress: vi.fn().mockResolvedValue([address]),
  };
}

describe("processCustomerIntake", () => {
  it("ruft bei ungültiger Eingabe keinen Provider auf", async () => {
    const deps = dependencies();
    await expect(processCustomerIntake(" ", deps)).resolves.toMatchObject({
      status: "manual",
      reason: "invalid_input",
    });
    expect(deps.consumeCustomerAiQuota).not.toHaveBeenCalled();
    expect(deps.extractCustomerData).not.toHaveBeenCalled();
    expect(deps.geocodeCustomerAddress).not.toHaveBeenCalled();
  });

  it("blockiert den elften Versuch vor Claude und Mapbox", async () => {
    const deps = dependencies();
    deps.consumeCustomerAiQuota.mockResolvedValue({
      allowed: false,
      remaining: 0,
      dailyLimit: 10,
    });

    await expect(
      processCustomerIntake("Max Mustermann", deps),
    ).resolves.toEqual({
      status: "manual",
      reason: "daily_limit_reached",
      customer: EMPTY_CUSTOMER_INTAKE,
      dailyLimit: 10,
    });
    expect(deps.extractCustomerData).not.toHaveBeenCalled();
    expect(deps.geocodeCustomerAddress).not.toHaveBeenCalled();
  });

  it("ruft bei einer nicht prüfbaren Quote keinen Provider auf", async () => {
    const deps = dependencies();
    deps.consumeCustomerAiQuota.mockRejectedValue(new Error("database unavailable"));

    await expect(
      processCustomerIntake("Max Mustermann", deps),
    ).resolves.toMatchObject({
      status: "manual",
      reason: "quota_unavailable",
    });
    expect(deps.extractCustomerData).not.toHaveBeenCalled();
    expect(deps.geocodeCustomerAddress).not.toHaveBeenCalled();
  });

  it("öffnet bei fehlenden extrahierten Daten direkt den manuellen Weg", async () => {
    const deps = dependencies(EMPTY_CUSTOMER_INTAKE);
    await expect(processCustomerIntake("unbekannt", deps)).resolves.toMatchObject({
      status: "manual",
      reason: "no_extracted_data",
    });
    expect(deps.geocodeCustomerAddress).not.toHaveBeenCalled();
  });

  it("überspringt Mapbox ohne Straße oder ohne PLZ und Ort", async () => {
    const deps = dependencies({
      ...customer,
      street: null,
      postcode: "55116",
    });
    await expect(processCustomerIntake("Max Mustermann Mainz", deps)).resolves.toMatchObject({
      status: "manual",
      reason: "insufficient_address",
    });
    expect(deps.geocodeCustomerAddress).not.toHaveBeenCalled();
  });

  it("sucht auch ohne Hausnummer und gibt maximal drei Treffer zurück", async () => {
    const deps = dependencies();
    deps.geocodeCustomerAddress.mockResolvedValue([
      address,
      { ...address, id: "address-2" },
      { ...address, id: "address-3" },
      { ...address, id: "address-4" },
    ]);
    const result = await processCustomerIntake("Max Hauptstraße Mainz", deps);
    expect(deps.geocodeCustomerAddress).toHaveBeenCalledWith(customer);
    expect(result).toMatchObject({ status: "address_matches" });
    if (result.status === "address_matches") {
      expect(result.addresses).toHaveLength(3);
    }
  });

  it("behält sichere Claude-Daten bei einem Mapbox-Fehler", async () => {
    const deps = dependencies();
    deps.geocodeCustomerAddress.mockRejectedValue(new Error("provider unavailable"));
    await expect(processCustomerIntake("Max Hauptstraße Mainz", deps)).resolves.toEqual({
      status: "manual",
      reason: "geocoding_failed",
      customer,
    });
  });

  it("behandelt leere Treffer als manuellen Weg", async () => {
    const deps = dependencies();
    deps.geocodeCustomerAddress.mockResolvedValue([]);
    await expect(processCustomerIntake("Max Hauptstraße Mainz", deps)).resolves.toMatchObject({
      status: "manual",
      reason: "no_matches",
      customer,
    });
  });

  it("fängt Claude-Fehler ohne Weitergabe interner Details ab", async () => {
    const deps = dependencies();
    deps.extractCustomerData.mockRejectedValue(new Error("secret provider detail"));
    await expect(processCustomerIntake("Max Mustermann", deps)).resolves.toEqual({
      status: "manual",
      reason: "extraction_failed",
      customer: EMPTY_CUSTOMER_INTAKE,
    });
    expect(deps.consumeCustomerAiQuota).toHaveBeenCalledOnce();
  });
});
