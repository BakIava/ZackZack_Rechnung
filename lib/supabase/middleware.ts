import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

interface SessionUpdate {
  response: NextResponse;
  user: User | null;
  hasCompletedSetup: boolean;
}

interface SessionOptions {
  includeSetupStatus?: boolean;
}

export async function updateSession(
  request: NextRequest,
  response: NextResponse = NextResponse.next({ request }),
  { includeSetupStatus = false }: SessionOptions = {},
): Promise<SessionUpdate> {
  let supabaseResponse = response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the auth session if expired – required for Server Components.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasCompletedSetup = false;
  if (user && includeSetupStatus) {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    hasCompletedSetup = Boolean(data);
  }

  return { response: supabaseResponse, user, hasCompletedSetup };
}
