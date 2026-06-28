"use client";

import "./SetupReview.css";
import Image from "next/image";
import { SetupIcon } from "./SetupIcon";
import { type Translations, type Lang } from "./translations";
import { LangLink, DesktopBar, UpProgress } from "./SetupPrimitives";
import { ReviewFields } from "./SetupStepFields";

interface ReviewProps {
  t: Translations;
  lang: Lang;
  dir: "ltr" | "rtl";
  isMobile: boolean;
  onApply: () => void;
  onBack: () => void;
}

export function SetupReview({ t, lang, dir, isMobile, onApply, onBack }: ReviewProps) {
  if (isMobile) {
    return (
      <div className="ob-root" dir={dir}>
        <div className="ob-top">
          <button className="ob-back" onClick={onBack}>
            <SetupIcon name="chevronLeft" size={20} />
          </button>
          <div className="ob-top-mid">
            <div className="ob-top-brand">
              <Image src="/assets/zackzack-mark.png" alt="" width={18} height={18} style={{ height: 18, width: "auto" }} />
              {t.revTitle}
            </div>
            <div className="ob-top-sub">{t.setupSub}</div>
          </div>
          <div className="ob-top-spacer" />
        </div>
        <div className="ob-body">
          <div className="ob-review-banner">
            <div className="ob-review-banner-ic"><SetupIcon name="sparkle" size={20} /></div>
            <div>
              <div className="ob-review-banner-t">{t.revBannerT}</div>
              <div className="ob-review-banner-s">{t.revBannerS}</div>
            </div>
          </div>
          <ReviewFields t={t} />
        </div>
        <div className="ob-foot">
          <button className="ob-next" onClick={onApply}>
            <SetupIcon name="check" size={20} weight="bold" />{t.revApply}
          </button>
          <LangLink lang={lang} />
        </div>
      </div>
    );
  }

  return (
    <div className="ob-d" dir={dir}>
      <DesktopBar t={t} />
      <div className="ob-d-scroll">
        <div className="ob-d-wrap">
          <div className="ob-d-head">
            <div className="ob-d-kicker">{t.tileUploadT}</div>
            <div className="ob-d-title">{t.revTitle}</div>
          </div>
          <UpProgress t={t} upIndex={3} />
          <div className="ob-d-card">
            <div className="ob-review-banner">
              <div className="ob-review-banner-ic"><SetupIcon name="sparkle" size={20} /></div>
              <div>
                <div className="ob-review-banner-t">{t.revBannerT}</div>
                <div className="ob-review-banner-s">{t.revBannerS}</div>
              </div>
            </div>
            <ReviewFields t={t} />
          </div>
          <div className="ob-d-wfoot">
            <button className="ob-d-back" onClick={onBack}>
              <SetupIcon name="chevronLeft" size={19} />{t.back}
            </button>
            <div className="ob-d-wfoot-r">
              <button className="ob-d-btn" onClick={onApply}>
                <SetupIcon name="check" size={19} weight="bold" />{t.revApply}
              </button>
            </div>
          </div>
          <LangLink lang={lang} />
        </div>
      </div>
    </div>
  );
}
