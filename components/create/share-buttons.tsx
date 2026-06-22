import { Download, Mail, MessageCircle } from "lucide-react";

interface ShareButtonsProps {
  labels: {
    wa: string;
    mail: string;
    save: string;
  };
}

const STROKE = 1.75;

/** Versand-Optionen für das fertige PDF (WhatsApp / E-Mail / Speichern). */
export function ShareButtons({ labels }: ShareButtonsProps) {
  return (
    <div className="sharegrid">
      <button type="button" className="sharebtn sharebtn--wa">
        <span className="sharebtn-ic">
          <MessageCircle size={24} strokeWidth={STROKE} color="#fff" aria-hidden />
        </span>
        {labels.wa}
      </button>
      <button type="button" className="sharebtn sharebtn--mail">
        <span className="sharebtn-ic">
          <Mail size={24} strokeWidth={STROKE} color="#fff" aria-hidden />
        </span>
        {labels.mail}
      </button>
      <button type="button" className="sharebtn sharebtn--save">
        <span className="sharebtn-ic">
          <Download size={24} strokeWidth={STROKE} color="#fff" aria-hidden />
        </span>
        {labels.save}
      </button>
    </div>
  );
}
