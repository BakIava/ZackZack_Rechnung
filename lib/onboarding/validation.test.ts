import { describe, expect, it } from "vitest";
import { INITIAL_FORM_DATA } from "@/components/setup/form-defaults";
import type { SetupFormData } from "@/types/company";
import {
  getFirstSetupErrorStep,
  getSetupErrorSteps,
  validateSetupForm,
  validateSetupStep,
} from "./validation";

const completeForm: SetupFormData = {
  ...INITIAL_FORM_DATA,
  name: "Yılmaz Malerbetrieb",
  director: "Mehmet Yılmaz",
  legal_form: "einzel",
  street: "Musterstraße",
  street_no: "1",
  postcode: "10115",
  city: "Berlin",
  trade_ids: ["painter"],
  steuernummer: "12/345/67890",
  iban: "DE02120300000000202051",
};

describe("setup validation", () => {
  it("meldet die konkreten Pflichtangaben des Betriebs-Schritts", () => {
    expect(validateSetupStep(1, INITIAL_FORM_DATA)).toEqual({
      name: "name_required",
      director: "director_required",
      street: "street_required",
      street_no: "street_no_required",
      postcode: "postcode_required",
      city: "city_required",
      trade_ids: "trades_required",
    });
  });

  it("verlangt Registerangaben nur bei einer eingetragenen Rechtsform", () => {
    expect(
      validateSetupStep(1, { ...completeForm, legal_form: "gmbh" }),
    ).toMatchObject({
      handelsregister_nr: "register_number_required",
      registergericht: "register_court_required",
    });
    expect(validateSetupStep(1, completeForm)).toEqual({});
  });

  it("lässt Kontakt und Logo optional, verlangt aber die IBAN", () => {
    expect(validateSetupStep(2, completeForm)).toEqual({});
    expect(validateSetupStep(4, { ...completeForm, iban: "" })).toEqual({
      iban: "iban_required",
    });
    expect(validateSetupStep(4, completeForm)).toEqual({});
    expect(validateSetupStep(5, completeForm)).toEqual({});
  });

  it("akzeptiert die USt-IdNr. als Alternative zur Steuernummer", () => {
    expect(
      validateSetupStep(3, { ...completeForm, steuernummer: "", ust_id: "DE123456789" }),
    ).toEqual({});
    expect(
      validateSetupStep(3, { ...completeForm, steuernummer: "", ust_id: "" }),
    ).toEqual({ steuernummer: "tax_number_required" });
  });

  it("ordnet Fehler dem ersten betroffenen Schritt zu", () => {
    const errors = validateSetupForm({
      ...completeForm,
      name: "",
      steuernummer: "",
      iban: "",
    });

    expect(getFirstSetupErrorStep(errors)).toBe(1);
    expect(getSetupErrorSteps(errors)).toEqual([1, 3, 4]);
  });
});
