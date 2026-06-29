"use client";

import "./SetupStepFields.css";
import { SetupIcon } from "./SetupIcon";
import { type Translations } from "./translations";
import { Field, TextInput } from "./SetupPrimitives";

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
  onChoose?: () => void;
}

export function UploadOpts({ t, onChoose }: UploadOptsProps) {
  const opts = [
    ["camera", t.upCam, t.upCamS],
    ["image", t.upGal, t.upGalS],
    ["file", t.upPdf, t.upPdfS],
  ] as const;
  return (
    <div className="ob-up-opts">
      {opts.map(([ic, title, sub]) => (
        <button type="button" className="ob-up-opt" key={ic} onClick={onChoose}>
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
}

export function ReviewFields({ t }: ReviewFieldsProps) {
  const Detected = () => (
    <span className="ob-detected">
      <SetupIcon name="check" size={11} weight="bold" />{t.detected}
    </span>
  );
  const TodoBadge = () => (
    <span className="ob-detected ob-detected--todo">{t.todo}</span>
  );

  return (
    <div className="ob-form">
      <div className="ob-group-lbl">{t.grpBetrieb}</div>
      <Field label={t.firma} req badge={<Detected />}>
        <TextInput value="Yılmaz Malerbetrieb" valid />
      </Field>
      <Field label={t.rechtsform} req badge={<TodoBadge />} todo={t.rfTodo}>
        <TextInput placeholder={t.rfTodo} />
      </Field>
      <div className="ob-row2">
        <div className="ob-grow">
          <Field label={t.strasse} req badge={<Detected />}>
            <TextInput value="Hansastraße" valid />
          </Field>
        </div>
        <div className="ob-hnr">
          <Field label={t.hausnr} req>
            <TextInput value="22" valid />
          </Field>
        </div>
      </div>
      <div className="ob-row2">
        <div className="ob-plz">
          <Field label={t.plz} req>
            <TextInput value="60314" valid />
          </Field>
        </div>
        <div className="ob-grow">
          <Field label={t.ort} req badge={<Detected />}>
            <TextInput value="Frankfurt am Main" valid />
          </Field>
        </div>
      </div>
      <div className="ob-group-lbl">{t.grpSteuer}</div>
      <Field label={t.steuernr} req badge={<Detected />}>
        <TextInput value="047/815/08150" valid mono />
      </Field>
      <div className="ob-group-lbl">{t.grpBank}</div>
      <Field label={t.iban} badge={<Detected />}>
        <TextInput value="DE89 3704 0044 0532 0130 00" valid mono dir="ltr" />
      </Field>
    </div>
  );
}
