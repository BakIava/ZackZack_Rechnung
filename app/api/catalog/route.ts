import { NextResponse } from "next/server";

/** Placeholder – replaced by Supabase-backed catalog. Cached offline by Serwist. */
export async function GET() {
  return NextResponse.json({
    items: [
      {
        id: "1",
        title: "Innenanstrich (qm)",
        unit: "qm",
        unit_price_cents: 1200,
      },
    ],
  });
}
