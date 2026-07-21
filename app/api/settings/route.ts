import { NextResponse } from "next/server";
import { publicOfflineCacheHeaders } from "@/lib/pwa/offline-cache";

/** Placeholder – business profile / Stammdaten. Cached offline by Serwist. */
export async function GET() {
  return NextResponse.json(
    {
      business: {
        name: "Yılmaz Malerbetrieb",
        address: "Musterstraße 12, 10115 Berlin",
        small_business_exempt: true,
      },
    },
    { headers: publicOfflineCacheHeaders() },
  );
}
