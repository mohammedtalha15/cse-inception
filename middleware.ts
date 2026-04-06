import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseCredentials } from "@/lib/supabase/env-server";

/**
 * Refreshes Supabase Auth cookies when configured. Skips all work if env is unset.
 */
export async function middleware(request: NextRequest) {
  const creds = getSupabaseCredentials();
  if (!creds) {
    return NextResponse.next();
  }
  const { url: supabaseUrl, anonKey: supabaseKey } = creds;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/auth/callback",
    "/dashboard/:path*",
    "/profile/:path*",
    "/enter-data",
    "/alerts",
    "/alerts/:path*",
  ],
};
