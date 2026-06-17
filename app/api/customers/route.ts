import { NextResponse } from "next/server";

/** Placeholder – replaced by Supabase-backed customer list. Cached offline by Serwist. */
export async function GET() {
  return NextResponse.json({
    customers: [
      { id: "1", name: "Familie Schneider", address: "Gartenweg 4, Berlin" },
    ],
  });
}
