"use server";

import { markDocumentPaid } from "@/lib/repositories/documents";

export async function markDocumentAsPaid(documentId: string): Promise<{ error?: string }> {
  return markDocumentPaid(documentId);
}
