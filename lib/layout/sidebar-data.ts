import { cache } from "react";
import { getCompanyNameAndDirector } from "@/lib/repositories/companies";
import { countCustomers } from "@/lib/repositories/customers";
import { countServices } from "@/lib/repositories/services";

export interface SidebarData {
  company: {
    name: string;
    director: string;
  };
  customerCount: number;
  catalogCount: number;
}

/**
 * Gemeinsame Sidebar-Daten eines Server-Renders.
 *
 * React `cache` hält ausschließlich für den aktuellen RSC-Request. Dadurch
 * teilen sich Layout und Dashboard identische Reads, ohne firmenspezifische
 * Ergebnisse requestübergreifend zu speichern.
 */
export const getSidebarData = cache(async (): Promise<SidebarData> => {
  const [company, customerCount, catalogCount] = await Promise.all([
    getCompanyNameAndDirector(),
    countCustomers(),
    countServices(),
  ]);

  return { company, customerCount, catalogCount };
});
