import { useTranslations } from "next-intl";
import { Skeleton, SkeletonList } from "@/components/ui";
import "./documents-loading.css";

interface DocumentsLoadingProps {
  count?: number;
}

export function DocumentsLoading({ count = 5 }: DocumentsLoadingProps) {
  const t = useTranslations("Documents");

  return (
    <main className="dmain documents-loading">
      <div className="dtopbar">
        <div>
          <div className="greet-sub">{t("subtitle")}</div>
          <div className="greet-main">{t("title")}</div>
        </div>
        <Skeleton width="360px" height="42px" radius="10px" />
      </div>

      <div className="dscroll">
        <div className="documents-loading-stats" aria-hidden>
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="documents-loading-stat" key={index}>
              <Skeleton width="44%" height="13px" />
              <Skeleton width="55%" height="28px" />
              <Skeleton width="36%" height="12px" />
            </div>
          ))}
        </div>

        <div className="documents-loading-filters" aria-hidden>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={index}
              width={index < 2 ? "82px" : "104px"}
              height="34px"
              radius="999px"
            />
          ))}
        </div>

        <div className="documents-loading-grid">
          <SkeletonList count={count} caption={t("listHead")} />
          <div className="documents-loading-detail" aria-hidden>
            <Skeleton width="48px" height="48px" radius="12px" />
            <Skeleton width="48%" height="20px" />
            <Skeleton width="70%" height="13px" />
            <Skeleton width="100%" height="1px" />
            <Skeleton width="82%" height="13px" />
            <Skeleton width="64%" height="13px" />
          </div>
        </div>
      </div>
    </main>
  );
}
