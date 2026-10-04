import { useTranslations } from "next-intl";
import { Skeleton, SkeletonList } from "@/components/ui";
import "./customers-loading.css";

interface CustomersLoadingProps {
  count?: number;
}

export function CustomersLoading({ count = 6 }: CustomersLoadingProps) {
  const t = useTranslations("Customers");

  return (
    <main className="dmain customers-loading">
      <div className="customers-loading-master">
        <div className="customers-loading-head">
          <div className="customers-loading-title">{t("customers")}</div>
          <Skeleton height="42px" radius="10px" />
          <div className="customers-loading-chips" aria-hidden>
            <Skeleton width="72px" height="34px" radius="999px" />
            <Skeleton width="96px" height="34px" radius="999px" />
          </div>
        </div>
        <div className="customers-loading-list">
          <SkeletonList count={count} caption={t("customers")} />
        </div>
      </div>

      <div className="customers-loading-detail" aria-hidden>
        <div className="customers-loading-profile">
          <Skeleton width="64px" height="64px" radius="14px" />
          <div className="customers-loading-profile-copy">
            <Skeleton width="52%" height="21px" />
            <Skeleton width="34%" height="13px" />
          </div>
        </div>
        <Skeleton width="100%" height="1px" />
        <Skeleton width="72%" height="14px" />
        <Skeleton width="58%" height="14px" />
        <Skeleton width="66%" height="14px" />
      </div>
    </main>
  );
}
