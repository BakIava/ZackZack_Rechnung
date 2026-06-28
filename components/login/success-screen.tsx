import { Check, ArrowRight, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface SuccessScreenProps {
  name: string;
}

/** Schritt 3: Bestätigung und Übergang zum Dashboard. */
export function SuccessScreen({ name }: SuccessScreenProps) {
  const t = useTranslations("Login");

  return (
    <div className="lg-card lg-fade">
      <div className="lg-success">
        <div className="lg-check">
          <Check size={48} aria-hidden />
        </div>
        <h1 className="lg-title">{t("titleSuccess")}</h1>
        <p className="lg-sub lg-success-greet">{t("subSuccess", { name })}</p>
        <div className="lg-progress">
          <i />
        </div>
        <p className="lg-sub lg-success-prep">{t("preparing")}</p>
        <Link href="/setup" className="lg-btn lg-success-btn">
          {t("toDashboard")}
          <ArrowRight size={22} aria-hidden />
        </Link>
        <div className="lg-reassure lg-success-note">
          <ShieldCheck size={20} aria-hidden />
          <span>{t("stayNote")}</span>
        </div>
      </div>
    </div>
  );
}
