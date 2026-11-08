"use client";

import { FilePenLine } from "lucide-react";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { reopenInvoice } from "@/lib/documents/reopen-actions";
import { CorrectInvoiceDialog } from "./correct-invoice-dialog";

interface CorrectInvoiceButtonProps {
  documentId: string;
  documentNumber: string;
  /** Button-Klassen des jeweiligen Screens (Belegdetail bzw. Schritt 3). */
  className: string;
}

/**
 * „Korrigieren" für eine festgeschriebene, unbezahlte Rechnung: Nach der
 * Bestätigung wird sie wieder zum Entwurf (gleiche Nummer) und der Flow
 * springt zu den Positionen (Schritt 2).
 */
export function CorrectInvoiceButton({
  documentId,
  documentNumber,
  className,
}: CorrectInvoiceButtonProps) {
  const t = useTranslations("Documents");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleOpen() {
    setFailed(false);
    setOpen(true);
  }

  function handleConfirm() {
    setFailed(false);
    startTransition(async () => {
      const result = await reopenInvoice(documentId);
      if ("error" in result) {
        setFailed(true);
        return;
      }
      router.push(`/create/${documentId}/2`);
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" className={className} onClick={handleOpen}>
        <FilePenLine size={17} strokeWidth={1.75} aria-hidden />
        {t("correctInvoice")}
      </button>
      {open && (
        <CorrectInvoiceDialog
          documentNumber={documentNumber}
          pending={pending}
          failed={failed}
          onConfirm={handleConfirm}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}
