"use client";

import { Download, Loader2, Mail, MessageCircle, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useShareDocument,
  type ShareChannel,
  type ShareTarget,
} from "@/components/create/use-share-document";
import "./documents-main.css";

const STROKE = 1.75;

interface DocShareRowProps {
  target: ShareTarget;
}

/**
 * Teilen-Reihe (WhatsApp / E-Mail / PDF) im Detail-Panel der Dokumentenliste.
 * Nutzt bewusst DIESELBE Logik wie Schritt 3 (useShareDocument): mobil natives
 * Teilen mit Datei-Anhang, sonst Download + Kanal zum manuellen Anhängen.
 * Als eigene Komponente ausgelagert, damit der Hook unbedingt (nicht hinter dem
 * Early-Return von DocDetail) aufgerufen wird.
 */
export function DocShareRow({ target }: DocShareRowProps) {
  const t = useTranslations("Documents");
  const { state, share } = useShareDocument(target);
  const busy = state.pending !== null;

  function icon(channel: ShareChannel) {
    if (state.pending === channel) {
      return <Loader2 size={20} strokeWidth={STROKE} className="hshare-spin" aria-hidden />;
    }
    if (channel === "whatsapp") return <MessageCircle size={20} strokeWidth={STROKE} aria-hidden />;
    if (channel === "email") return <Mail size={20} strokeWidth={STROKE} aria-hidden />;
    return <Download size={20} strokeWidth={STROKE} aria-hidden />;
  }

  return (
    <>
      <div className="hshare">
        <button
          type="button"
          className="hshare-btn wa"
          onClick={() => share("whatsapp")}
          disabled={busy}
        >
          <span className="hshare-ic">{icon("whatsapp")}</span>
          {t("shareWa")}
        </button>
        <button
          type="button"
          className="hshare-btn mail"
          onClick={() => share("email")}
          disabled={busy}
        >
          <span className="hshare-ic">{icon("email")}</span>
          {t("shareMail")}
        </button>
        <button
          type="button"
          className="hshare-btn pdf"
          onClick={() => share("download")}
          disabled={busy}
        >
          <span className="hshare-ic">{icon("download")}</span>
          {t("sharePdf")}
        </button>
      </div>

      {state.error && (
        <div className="dshare-note dshare-note--err">
          <TriangleAlert size={15} strokeWidth={STROKE} aria-hidden />
          {t("shareError")}
        </div>
      )}
      {state.downloadedHint && !state.error && (
        <div className="dshare-note">
          <Download size={15} strokeWidth={STROKE} aria-hidden />
          {t("shareDownloadedHint")}
        </div>
      )}
    </>
  );
}
