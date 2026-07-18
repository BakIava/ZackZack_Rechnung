import { getTranslations } from "next-intl/server";
import { SidebarLangLink } from "./sidebar-lang-link";
import { SidebarNav } from "./sidebar-nav";
import { getCompanyNameAndDirector } from "@/lib/repositories/companies";
import { countCustomers } from "@/lib/repositories/customers";
import { countServices } from "@/lib/repositories/services";
import "./sidebar.css";

function toInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Linke Navigationsleiste des Desktop-Dashboards (RTL-fest). */
export async function Sidebar() {
  const t = await getTranslations("Dashboard");

  const [company, customerCount, catalogCount] = await Promise.all([
    getCompanyNameAndDirector(),
    countCustomers(),
    countServices(),
  ]);

  const companyName = company.name;
  const ownerName = company.director;
  const initials = toInitials(companyName);

  return (
    <aside className="dside">
      <div className="dside-brand">
        <div className="dside-logo">{initials}</div>
        <div>
          <div className="dside-name">{companyName}</div>
        </div>
      </div>

      <SidebarNav
        customerCount={customerCount}
        catalogCount={catalogCount}
        menuLabel={t("menu")}
      />

      <div className="dside-foot">
        <SidebarLangLink />
        <div className="dside-user">
          <span className="dside-av">{initials}</span>
          <div className="dside-uname">{ownerName}</div>
        </div>
      </div>
    </aside>
  );
}
