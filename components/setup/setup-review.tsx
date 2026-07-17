"use client";

import "./setup-review.css";
import Image from "next/image";
import { SetupIcon } from "./setup-icon";
import { type Translations, type Lang } from "./translations";
import { LangLink, DesktopBar, UpProgress } from "./setup-primitives";
import { ReviewFields } from "./setup-other-fields";
import type { SetupFormData } from "@/types/company";
import type {
  OnboardingExtractableField,
  OnboardingExtractionStatuses,
} from "@/types/onboarding-extraction";

interface ReviewProps {
  t: Translations;
  lang: Lang;
  dir: "ltr" | "rtl";
  isMobile: boolean;
  onApply: () => void;
  onBack: () => void;
  submitting?: boolean;
  formData: SetupFormData;
  statuses: OnboardingExtractionStatuses;
  onFormChange: <K extends OnboardingExtractableField>(
    key: K,
    value: SetupFormData[K],
  ) => void;
}

export function SetupReview({
  t,
  lang,
  dir,
  isMobile,
  onApply,
  onBack,
  submitting,
  formData,
  statuses,
  onFormChange,
}: ReviewProps) {
  if (isMobile) {
    return (
      <div className="ob-root" dir={dir}>
        <div className="ob-top">
          <button className="ob-back" onClick={onBack}>
            <SetupIcon name="chevronLeft" size={20} />
          </button>
          <div className="ob-top-mid">
            <div className="ob-top-brand">
              <Image src="/assets/zackzack-mark.png" alt="" width={24} height={18} className="ob-brand-mark" />
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
          <ReviewFields
            t={t}
            formData={formData}
            statuses={statuses}
            onChange={onFormChange}
          />
        </div>
        <div className="ob-foot">
          <button className="ob-next" onClick={onApply} disabled={submitting}>
            {submitting
              ? <span className="ob-icon-spin"><SetupIcon name="spinner" size={20} /></span>
              : <SetupIcon name="check" size={20} weight="bold" />}
            {t.revApply}
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
            <ReviewFields
              t={t}
              formData={formData}
              statuses={statuses}
              onChange={onFormChange}
            />
          </div>
          <div className="ob-d-wfoot">
            <button className="ob-d-back" onClick={onBack}>
              <SetupIcon name="chevronLeft" size={19} />{t.back}
            </button>
            <div className="ob-d-wfoot-r">
              <button className="ob-d-btn" onClick={onApply} disabled={submitting}>
                {submitting
                  ? <span className="ob-icon-spin"><SetupIcon name="spinner" size={19} /></span>
                  : <SetupIcon name="check" size={19} weight="bold" />}
                {t.revApply}
              </button>
            </div>
          </div>
          <LangLink lang={lang} />
        </div>
      </div>
    </div>
  );
}
