"use client";

import "./setup-step-fields.css";
import { SetupIcon } from "./setup-icon";
import { type Translations } from "./translations";
import { Field, Seg3, TextInput } from "./setup-primitives";
import type {
  OnboardingExtractableField,
  OnboardingExtractionStatuses,
} from "@/types/onboarding-extraction";
import type { SetupFormData } from "@/types/company";

// ── EntryTiles ────────────────────────────────────────────────────────────────

interface EntryTilesProps {
  t: Translations;
  row?: boolean;
  onUpload?: () => void;
  onManual?: () => void;
}

export function EntryTiles({ t, row, onUpload, onManual }: EntryTilesProps) {
  return (
    <div className={"ob-entry-tiles" + (row ? " ob-entry-tiles--row" : "")}>
      <button type="button" className="ob-entry-tile ob-entry-tile--up" onClick={onUpload}>
        <div className="ob-entry-tile-ic"><SetupIcon name="scan" size={28} /></div>
        <div className="ob-entry-tile-tx">
          <div className="ob-entry-tile-t">
            {t.tileUploadT}
            <span className="ob-tile-fast">{t.tileFast}</span>
          </div>
          <div className="ob-entry-tile-s">{t.tileUploadS}</div>
        </div>
        <div className="ob-entry-tile-aff"><SetupIcon name="chevronRight" size={20} /></div>
      </button>
      <button type="button" className="ob-entry-tile ob-entry-tile--man" onClick={onManual}>
        <div className="ob-entry-tile-ic"><SetupIcon name="pencil" size={26} /></div>
        <div className="ob-entry-tile-tx">
          <div className="ob-entry-tile-t">{t.tileManualT}</div>
          <div className="ob-entry-tile-s">{t.tileManualS}</div>
        </div>
        <div className="ob-entry-tile-aff"><SetupIcon name="chevronRight" size={20} /></div>
      </button>
    </div>
  );
}

// ── UploadOpts ────────────────────────────────────────────────────────────────

interface UploadOptsProps {
  t: Translations;
  onChoose?: (source: SetupUploadSource) => void;
}

export type SetupUploadSource = "camera" | "gallery" | "pdf";

export function UploadOpts({ t, onChoose }: UploadOptsProps) {
  const opts = [
    ["camera", t.upCam, t.upCamS, "camera"],
    ["image", t.upGal, t.upGalS, "gallery"],
    ["file", t.upPdf, t.upPdfS, "pdf"],
  ] as const;
  return (
    <div className="ob-up-opts">
      {opts.map(([ic, title, sub, source]) => (
        <button
          type="button"
          className="ob-up-opt"
          key={ic}
          onClick={() => onChoose?.(source)}
        >
          <div className="ob-up-opt-ic"><SetupIcon name={ic} size={22} /></div>
          <div className="ob-up-opt-tx">
            <div className="ob-up-opt-t">{title}</div>
            <div className="ob-up-opt-s">{sub}</div>
          </div>
          <div className="ob-up-opt-aff"><SetupIcon name="chevronRight" size={20} /></div>
        </button>
      ))}
    </div>
  );
}

// ── ReviewFields ──────────────────────────────────────────────────────────────

interface ReviewFieldsProps {
  t: Translations;
  formData: SetupFormData;
  statuses: OnboardingExtractionStatuses;
  onChange: <K extends OnboardingExtractableField>(
    key: K,
    value: SetupFormData[K],
  ) => void;
}

interface StatusBadgeProps {
  field: OnboardingExtractableField;
  statuses: OnboardingExtractionStatuses;
  t: Translations;
}

function StatusBadge({ field, statuses, t }: StatusBadgeProps) {
  return statuses[field] === "found" ? (
    <span className="ob-detected">
      <SetupIcon name="check" size={11} weight="bold" />{t.detected}
    </span>
  ) : (
    <span className="ob-detected ob-detected--todo">{t.todo}</span>
  );
}

export function ReviewFields({ t, formData, statuses, onChange }: ReviewFieldsProps) {
  const badge = (field: OnboardingExtractableField) => (
    <StatusBadge field={field} statuses={statuses} t={t} />
  );

  return (
    <div className="ob-form">
      <div className="ob-group-lbl">{t.grpBetrieb}</div>
      <Field label={t.firma} req badge={badge("name")}>
        <TextInput
          value={formData.name}
          onChange={(value) => onChange("name", value)}
          valid={statuses.name === "found"}
        />
      </Field>
      <Field label={t.director} req badge={badge("director")}>
        <TextInput
          value={formData.director}
          onChange={(value) => onChange("director", value)}
          valid={statuses.director === "found"}
        />
      </Field>
      <Field label={t.rechtsform} req badge={badge("legal_form")}>
        <Seg3
          options={t.rf}
          value={formData.legal_form}
          onChange={(value) => onChange("legal_form", value)}
          wrap
        />
      </Field>
      <div className="ob-row2">
        <div className="ob-grow">
          <Field label={t.strasse} req badge={badge("street")}>
            <TextInput
              value={formData.street}
              onChange={(value) => onChange("street", value)}
              valid={statuses.street === "found"}
            />
          </Field>
        </div>
        <div className="ob-hnr">
          <Field label={t.hausnr} req badge={badge("street_no")}>
            <TextInput
              value={formData.street_no}
              onChange={(value) => onChange("street_no", value)}
              valid={statuses.street_no === "found"}
            />
          </Field>
        </div>
      </div>
      <div className="ob-row2">
        <div className="ob-plz">
          <Field label={t.plz} req badge={badge("postcode")}>
            <TextInput
              value={formData.postcode}
              onChange={(value) => onChange("postcode", value)}
              valid={statuses.postcode === "found"}
            />
          </Field>
        </div>
        <div className="ob-grow">
          <Field label={t.ort} req badge={badge("city")}>
            <TextInput
              value={formData.city}
              onChange={(value) => onChange("city", value)}
              valid={statuses.city === "found"}
            />
          </Field>
        </div>
      </div>

      <div className="ob-group-lbl">{t.sc_t}</div>
      <Field label={t.email} badge={badge("email")}>
        <TextInput
          value={formData.email}
          onChange={(value) => onChange("email", value)}
          valid={statuses.email === "found"}
          dir="ltr"
        />
      </Field>
      <div className="ob-row2">
        <div className="ob-grow">
          <Field label={t.telefon} badge={badge("phone")}>
            <TextInput
              value={formData.phone}
              onChange={(value) => onChange("phone", value)}
              valid={statuses.phone === "found"}
              dir="ltr"
            />
          </Field>
        </div>
        <div className="ob-grow">
          <Field label={t.mobil} badge={badge("mobile")}>
            <TextInput
              value={formData.mobile}
              onChange={(value) => onChange("mobile", value)}
              valid={statuses.mobile === "found"}
              dir="ltr"
            />
          </Field>
        </div>
      </div>

      <div className="ob-group-lbl">{t.grpSteuer}</div>
      <Field label={t.steuernr} req badge={badge("steuernummer")}>
        <TextInput
          value={formData.steuernummer}
          onChange={(value) => onChange("steuernummer", value)}
          valid={statuses.steuernummer === "found"}
          mono
          dir="ltr"
        />
      </Field>
      <Field label={t.ustidnr} badge={badge("ust_id")}>
        <TextInput
          value={formData.ust_id}
          onChange={(value) => onChange("ust_id", value)}
          valid={statuses.ust_id === "found"}
          mono
          dir="ltr"
        />
      </Field>

      <div className="ob-group-lbl">{t.grpBank}</div>
      <Field label={t.iban} badge={badge("iban")}>
        <TextInput
          value={formData.iban}
          onChange={(value) => onChange("iban", value)}
          valid={statuses.iban === "found"}
          mono
          dir="ltr"
        />
      </Field>
      <div className="ob-row2">
        <div className="ob-grow">
          <Field label={t.bic} badge={badge("bic")}>
            <TextInput
              value={formData.bic}
              onChange={(value) => onChange("bic", value)}
              valid={statuses.bic === "found"}
              mono
              dir="ltr"
            />
          </Field>
        </div>
        <div className="ob-grow">
          <Field label={t.bankName} badge={badge("bank_name")}>
            <TextInput
              value={formData.bank_name}
              onChange={(value) => onChange("bank_name", value)}
              valid={statuses.bank_name === "found"}
            />
          </Field>
        </div>
      </div>
      <Field label={t.inhaber} badge={badge("account_holder")}>
        <TextInput
          value={formData.account_holder}
          onChange={(value) => onChange("account_holder", value)}
          valid={statuses.account_holder === "found"}
        />
      </Field>
    </div>
  );
}
