import { getTranslations } from "next-intl/server";
import { SidebarLangLink } from "./sidebar-lang-link";
import { SidebarNav } from "./sidebar-nav";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();

  const [companyRes, customersRes, catalogRes] = await Promise.all([
    supabase.from("companies").select("name, director").single(),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("services").select("id", { count: "exact", head: true }),
  ]);

  const companyName = companyRes.data?.name ?? "";
  const ownerName = companyRes.data?.director ?? "";
  const initials = toInitials(companyName);
  const customerCount = customersRes.count ?? 0;
  const catalogCount = catalogRes.count ?? 0;

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
