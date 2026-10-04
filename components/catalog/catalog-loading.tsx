import { useTranslations } from "next-intl";
import { Skeleton, SkeletonList } from "@/components/ui";
import "./catalog-loading.css";

interface CatalogLoadingProps {
  count?: number;
}

export function CatalogLoading({ count = 6 }: CatalogLoadingProps) {
  const t = useTranslations("Catalog");

  return (
    <main className="dmain catalog-loading">
      <div className="dtopbar">
        <div>
          <div className="greet-sub">{t("subtitle")}</div>
          <div className="greet-main">{t("title")}</div>
        </div>
        <Skeleton width="360px" height="42px" radius="10px" />
      </div>

      <div className="catalog-loading-body">
        <div className="catalog-loading-master">
          <SkeletonList count={count} caption={t("listHead")} />
        </div>

        <div className="catalog-loading-detail" aria-hidden>
          <div className="catalog-loading-detail-head">
            <Skeleton width="62%" height="22px" />
            <Skeleton width="78%" height="13px" />
          </div>
          <div className="catalog-loading-detail-content">
            <Skeleton width="42%" height="12px" />
            <Skeleton width="66%" height="18px" />
            <Skeleton width="100%" height="1px" />
            <Skeleton width="48%" height="12px" />
            <Skeleton width="74%" height="16px" />
            <Skeleton width="58%" height="16px" />
          </div>
        </div>
      </div>
    </main>
  );
}
