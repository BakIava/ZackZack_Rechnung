"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pdfFileName } from "@/lib/pdf/pdf-filename";
import { shareMessage, shareSubject } from "@/lib/pdf/share-message";
import { DocType } from "@/shared/doc";

export type ShareChannel = "whatsapp" | "email" | "download";

/**
 * Minimal nötige Daten zum Teilen eines finalisierten Belegs — bewusst NICHT
 * das ganze DocumentPreview, damit sowohl Schritt 3 (voller Preview) als auch
 * die Dokumentenliste (Listeneintrag + Snapshot) denselben Hook nutzen können.
 */
export interface ShareTarget {
  documentId: string;
  docType: DocType;
  documentNumber: string;
  /** Grußzeile im Begleittext; null → ohne Signatur. */
  companyName: string | null;
  /** Empfänger für den E-Mail-Entwurf (Desktop-Fallback); null → offen lassen. */
  customerEmail: string | null;
  /** Nummer für den WhatsApp-Deeplink (Desktop-Fallback); null → wa.me ohne Ziel. */
  customerPhone: string | null;
}

export interface ShareState {
  /** Kanal, der gerade arbeitet (Spinner/disabled), oder null. */
  pending: ShareChannel | null;
  error: boolean;
  /** true, sobald der Desktop-Fallback das PDF nur heruntergeladen hat. */
  downloadedHint: boolean;
}

const PDF_MIME = "application/pdf";

/** Deutsche Handynummer grob nach wa.me-Format (Ziffern, ohne +/0). Best effort. */
function toWaNumber(phone: string | null): string | null {
  if (!phone) return null;
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = "49" + digits.slice(1);
  digits = digits.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

/** Grobe Geräte-Erkennung: Desktop-Browser sollen nie das native Share-Sheet
 * bekommen (dort ist es meist nur ein Screenshot-Teilen ohne Datei-Anhang). */
function isDesktopBrowser(): boolean {
  if (typeof navigator === "undefined") return true;
  const uaData = (navigator as Navigator & { userAgentData?: { mobile: boolean } }).userAgentData;
  if (uaData && typeof uaData.mobile === "boolean") return !uaData.mobile;
  return !/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function canShareFiles(file: File): boolean {
  return (
    !isDesktopBrowser() &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  );
}

function triggerDownload(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Object-URL erst nach dem Download freigeben.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Teilen-Logik für den finalisierten Beleg. Mobil (Zielgruppe) läuft alles über
 * das native Teilen-Sheet mit Datei-Anhang (Web Share API Level 2) — ein Tipp,
 * WhatsApp/E-Mail direkt mit PDF. Wo Datei-Teilen fehlt (meist Desktop), wird
 * das PDF heruntergeladen und der Kanal (WhatsApp Web / E-Mail-Entwurf) zum
 * manuellen Anhängen geöffnet. Keine WhatsApp-Business-API (Phase 2).
 *
 * Das PDF wird beim Mounten vorgeladen und im Ref gehalten: so wird
 * navigator.share() beim Tippen SYNCHRON aufgerufen (die für Web Share nötige
 * Nutzer-Aktivierung bleibt erhalten) und der Versand fühlt sich sofortig an —
 * wichtig für die nicht tech-affine Zielgruppe auf langsamem Baustellen-Netz.
 */
export function useShareDocument(target: ShareTarget) {
  const [state, setState] = useState<ShareState>({
    pending: null,
    error: false,
    downloadedHint: false,
  });
  const fileRef = useRef<File | null>(null);

  const { docType, documentNumber, companyName, customerEmail, customerPhone } = target;
  const fileName = pdfFileName({ docType, documentNumber });
  const subject = shareSubject(docType, documentNumber);
  const text = shareMessage(docType, documentNumber, companyName);
  const pdfUrl = `/api/documents/${target.documentId}/pdf`;

  const fetchPdfFile = useCallback(async (): Promise<File> => {
    const res = await fetch(pdfUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`pdf ${res.status}`);
    const blob = await res.blob();
    return new File([blob], fileName, { type: PDF_MIME });
  }, [pdfUrl, fileName]);

  // Vorladen – Fehler hier sind unkritisch, share() lädt bei Bedarf erneut.
  // Wechselt das Ziel-Dokument (z. B. andere Auswahl in der Dokumentenliste),
  // ändert sich fetchPdfFile → das alte vorgeladene File wird verworfen, damit
  // nie der Beleg eines zuvor gewählten Dokuments geteilt wird.
  useEffect(() => {
    let active = true;
    fileRef.current = null;
    fetchPdfFile()
      .then((f) => {
        if (active) fileRef.current = f;
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [fetchPdfFile]);

  const share = useCallback(
    async (channel: ShareChannel) => {
      setState({ pending: channel, error: false, downloadedHint: false });
      try {
        const file = fileRef.current ?? (await fetchPdfFile());
        fileRef.current = file;

        if (channel === "download") {
          triggerDownload(file);
          setState({ pending: null, error: false, downloadedHint: false });
          return;
        }

        // Bevorzugt: natives Teilen mit Datei-Anhang (mobil/PWA). Bei
        // vorgeladenem File ohne await → Nutzer-Aktivierung bleibt gültig.
        if (canShareFiles(file)) {          
          try {
            await navigator.share({ files: [file], title: subject, text });
          } catch (err) {
            // Abbruch im Sheet ist kein Fehler.
            if (!(err instanceof DOMException && err.name === "AbortError")) throw err;
          }
          setState({ pending: null, error: false, downloadedHint: false });
          return;
        }

        // Desktop-Fallback: PDF speichern, Kanal zum manuellen Anhängen öffnen.
        triggerDownload(file);
        if (channel === "whatsapp") {
          const num = toWaNumber(customerPhone);
          const base = num ? `https://wa.me/${num}` : "https://wa.me/";
          window.open(`${base}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
        } else {
          const to = customerEmail ?? "";
          const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;  
          window.location.href = href;
        }
        setState({ pending: null, error: false, downloadedHint: true });
      } catch {
        setState({ pending: null, error: true, downloadedHint: false });
      }
    },
    [fetchPdfFile, subject, text, customerPhone, customerEmail],
  );

  return { state, share };
}
