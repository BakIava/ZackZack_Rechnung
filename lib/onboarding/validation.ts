import type {
  OnboardingErrorCode,
  SetupFormData,
  SetupValidationErrors,
} from "@/types/company";

export type SetupStep = 1 | 2 | 3 | 4 | 5;

const REGISTERED_LEGAL_FORMS = new Set(["ek", "gmbh", "ug"]);

export const SETUP_FIELD_STEPS: Partial<
  Record<keyof SetupFormData, SetupStep>
> = {
  name: 1,
  director: 1,
  legal_form: 1,
  handelsregister_nr: 1,
  registergericht: 1,
  street: 1,
  street_no: 1,
  postcode: 1,
  city: 1,
  trade_ids: 1,
  email: 2,
  phone: 2,
  mobile: 2,
  fax: 2,
  steuernummer: 3,
  ust_id: 3,
  kleinunternehmer: 3,
  iban: 4,
  bic: 4,
  bank_name: 4,
  account_holder: 4,
};

const FIELD_ORDER: Array<keyof SetupFormData> = [
  "name",
  "director",
  "legal_form",
  "handelsregister_nr",
  "registergericht",
  "street",
  "street_no",
  "postcode",
  "city",
  "trade_ids",
  "steuernummer",
  "iban",
];

function required(
  errors: SetupValidationErrors,
  key: keyof SetupFormData,
  value: string,
  code: OnboardingErrorCode,
) {
  if (!value.trim()) errors[key] = code;
}

export function validateSetupStep(
  step: SetupStep,
  data: SetupFormData,
): SetupValidationErrors {
  const errors: SetupValidationErrors = {};

  if (step === 1) {
    required(errors, "name", data.name, "name_required");
    required(errors, "director", data.director, "director_required");
    required(errors, "legal_form", data.legal_form, "legal_form_required");
    required(errors, "street", data.street, "street_required");
    required(errors, "street_no", data.street_no, "street_no_required");
    required(errors, "postcode", data.postcode, "postcode_required");
    required(errors, "city", data.city, "city_required");

    if (REGISTERED_LEGAL_FORMS.has(data.legal_form)) {
      required(
        errors,
        "handelsregister_nr",
        data.handelsregister_nr,
        "register_number_required",
      );
      required(
        errors,
        "registergericht",
        data.registergericht,
        "register_court_required",
      );
    }

    if (data.trade_ids.length === 0) {
      errors.trade_ids = "trades_required";
    }
  }

  if (step === 3) {
    required(
      errors,
      "steuernummer",
      data.steuernummer,
      "tax_number_required",
    );
  }

  if (step === 4) {
    required(errors, "iban", data.iban, "iban_required");
  }

  return errors;
}

export function validateSetupForm(
  data: SetupFormData,
): SetupValidationErrors {
  return {
    ...validateSetupStep(1, data),
    ...validateSetupStep(2, data),
    ...validateSetupStep(3, data),
    ...validateSetupStep(4, data),
    ...validateSetupStep(5, data),
  };
}

export function getOrderedSetupErrorFields(
  errors: SetupValidationErrors,
): Array<keyof SetupFormData> {
  return FIELD_ORDER.filter((field) => Boolean(errors[field]));
}

export function getFirstSetupErrorStep(
  errors: SetupValidationErrors,
): SetupStep | null {
  const firstField = getOrderedSetupErrorFields(errors)[0];
  return firstField ? SETUP_FIELD_STEPS[firstField] ?? null : null;
}

export function getSetupErrorSteps(
  errors: SetupValidationErrors,
): SetupStep[] {
  return Array.from(
    new Set(
      getOrderedSetupErrorFields(errors)
        .map((field) => SETUP_FIELD_STEPS[field])
        .filter((step): step is SetupStep => step !== undefined),
    ),
  );
}
