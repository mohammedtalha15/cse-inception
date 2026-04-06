import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseCredentials } from "@/lib/supabase/env-server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = url.searchParams.get("next") ?? "/";

  const creds = getSupabaseCredentials();
  if (!creds) {
    return NextResponse.redirect(new URL("/?auth_error=missing_config", url.origin));
  }
  const { url: supabaseUrl, anonKey: supabaseKey } = creds;

  if (!code) {
    return NextResponse.redirect(new URL("/?auth_error=no_code", url.origin));
  }

  const response = NextResponse.redirect(new URL(nextPath, url.origin));

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  return response;
}
