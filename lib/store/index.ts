/**
 * Persistenz-Schnittstelle für Stammdaten, Katalog, Kunden, Dokumente.
 * Implementierung folgt (Supabase + offline-fähiger lokaler Cache).
 * Schreibvorgänge müssen offline funktionieren; Rechnungsnummern werden erst
 * beim Festschreiben (finalizeDocument) vergeben.
 */

import type {
  BusinessProfile,
  CatalogItem,
  Customer,
  Document,
} from "@/lib/db/schema";

export interface Store {
  getBusinessProfile(): Promise<BusinessProfile | null>;
  saveBusinessProfile(profile: BusinessProfile): Promise<void>;

  listCustomers(): Promise<Customer[]>;
  saveCustomer(customer: Customer): Promise<void>;

  listCatalog(): Promise<CatalogItem[]>;
  saveCatalogItem(item: CatalogItem): Promise<void>;

  listDocuments(): Promise<Document[]>;
  /** Entwurf anlegen – noch OHNE Rechnungsnummer. */
  saveDraft(document: Document): Promise<void>;
  /** Festschreiben – vergibt hier die lückenlose, fortlaufende Nummer. */
  finalizeDocument(documentId: string): Promise<Document>;
}

// TODO: createSupabaseStore() und createLocalStore() (offline) implementieren
// und über einen Sync-Layer zusammenführen.
