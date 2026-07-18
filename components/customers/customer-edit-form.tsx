"use client";

import { useState, useTransition } from "react";
import { Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { updateCustomer, deleteCustomer } from "@/lib/customers/actions";
import type { CustomerRow } from "@/types/customer";
import { CustomerTypeSelector } from "./customer-type-selector";
import "./customer-edit-form.css";

const STROKE = 1.75;

interface CustomerEditFormProps {
  customer: CustomerRow;
  onCancel: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function CustomerEditForm({
  customer,
  onCancel,
  onSaved,
  onDeleted,
}: CustomerEditFormProps) {
  const t = useTranslations("Customers");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDelPending, startDelTransition] = useTransition();
  const [showDelConfirm, setShowDelConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerType, setCustomerType] = useState(
    customer.customer_type ?? "private",
  );
  const isCompany = customerType === "business";
  const [firstname, setFirstname] = useState(customer.firstname ?? "");
  const [lastname, setLastname] = useState(customer.lastname ?? "");
  const [companyName, setCompanyName] = useState(customer.company_name ?? "");
  const [street, setStreet] = useState(customer.street ?? "");
  const [houseNo, setHouseNo] = useState(customer.street_no ?? "");
  const [postcode, setPostcode] = useState(customer.postcode ?? "");
  const [city, setCity] = useState(customer.city ?? "");
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [email, setEmail] = useState(customer.email ?? "");
  const [notes, setNotes] = useState(customer.notes ?? "");

  function handleSave() {
    // Tolerant: nur der Name ist Pflicht. Eine unvollständige Anschrift darf
    // gespeichert werden (später ergänzbar); auf > 250 €-Rechnungen weist der
    // Pflichtangaben-Check in Schritt 3 darauf hin.
    if (!isCompany) {
      if (!firstname.trim()) {
        setError(t("firstnameRequired"));
        return;
      }
      if (!lastname.trim()) {
        setError(t("lastnameRequired"));
        return;
      }
    } else {
      if (!companyName.trim()) {
        setError(t("companyNameRequired"));
        return;
      }
    }

    setError(null);
    startTransition(async () => {
      const res = await updateCustomer(customer.id, {
        customerType,
        firstname,
        lastname,
        companyName,
        street,
        streetNo: houseNo,
        postcode,
        city,
        phone,
        email,
        notes,
      });
      if (res.error) {
        setError(t("saveError"));
        return;
      }
      router.refresh();
      onSaved();
    });
  }

  function handleDelete() {
    startDelTransition(async () => {
      const res = await deleteCustomer(customer.id);
      if (res.error) {
        setError(t("deleteError"));
        setShowDelConfirm(false);
        return;
      }
      router.refresh();
      onDeleted();
    });
  }

  return (
    <div className="cdm-edit">
      <div className="cdm-edit-scroll">
        <div className="cdm-edit-grid">
          <div className="f-row">
            <span className="f-lbl">{t("typeLbl")}</span>
            <CustomerTypeSelector
              value={customerType}
              privateLabel={t("privateLbl")}
              businessLabel={t("businessLbl")}
              ariaLabel={t("typeLbl")}
              onChange={setCustomerType}
            />
          </div>

          <label className="f-row cdm-edit-full">
            <span className="f-lbl">{t("companyNameLbl")}</span>
            <input
              className="f-input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              autoFocus
            />
          </label>

          <label className="f-row">
            <span className="f-lbl">{t("firstnameLbl")}</span>
            <input
              className="f-input"
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
              autoFocus
            />
          </label>

          <label className="f-row">
            <span className="f-lbl">{t("lastnameLbl")}</span>
            <input
              className="f-input"
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
              autoFocus
            />
          </label>

          <label className="f-row">
            <span className="f-lbl">{t("streetLbl")}</span>
            <input
              className="f-input"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </label>
          <label className="f-row">
            <span className="f-lbl">{t("streetNoLbl")}</span>
            <input
              className="f-input"
              value={houseNo}
              onChange={(e) => setHouseNo(e.target.value)}
            />
          </label>
          <label className="f-row">
            <span className="f-lbl">{t("postcodeLbl")}</span>
            <input
              className="f-input"
              inputMode="numeric"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
            />
          </label>
          <label className="f-row">
            <span className="f-lbl">{t("cityLbl")}</span>
            <input
              className="f-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>
          <label className="f-row">
            <span className="f-lbl">{t("phone")}</span>
            <input
              className="f-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label className="f-row">
            <span className="f-lbl">{t("email")}</span>
            <input
              className="f-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="f-row cdm-edit-full">
            <span className="f-lbl">{t("noteLbl")}</span>
            <textarea
              className="f-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        <div className="cdm-del-zone">
          {!showDelConfirm ? (
            <button
              type="button"
              className="cdm-del-btn"
              onClick={() => setShowDelConfirm(true)}
            >
              <Trash2 size={16} strokeWidth={STROKE} aria-hidden />
              {t("deleteCustomer")}
            </button>
          ) : (
            <div className="cdm-del-confirm">
              <p className="cdm-del-confirm-msg">{t("deleteConfirm")}</p>
              <div className="cdm-del-confirm-btns">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowDelConfirm(false)}
                >
                  {t("deleteNo")}
                </button>
                <button
                  type="button"
                  className="btn-destroy"
                  disabled={isDelPending}
                  onClick={handleDelete}
                >
                  {isDelPending ? t("saving") : t("deleteYes")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="cdm-edit-foot">
        {error && <span className="cdm-edit-error">{error}</span>}
        <button type="button" className="btn-cancel" onClick={onCancel}>
          <X size={16} strokeWidth={STROKE} aria-hidden />
          {t("editCancel")}
        </button>
        <button
          type="button"
          className="btn-save"
          disabled={isPending}
          onClick={handleSave}
        >
          {isPending ? t("saving") : t("editSave")}
        </button>
      </div>
    </div>
  );
}
