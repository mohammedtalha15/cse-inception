import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseCredentials } from "@/lib/supabase/env-server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/";
  const nextPath = nextRaw.startsWith("/") ? nextRaw : "/";
  const providerError = url.searchParams.get("error");
  const providerErrorDesc = url.searchParams.get("error_description");

  const creds = getSupabaseCredentials();
  if (!creds) {
    return NextResponse.redirect(new URL("/?auth_error=missing_config", url.origin));
  }
  const { url: supabaseUrl, anonKey: supabaseKey } = creds;

  if (providerError) {
    const out = new URL("/auth/auth-code-error", url.origin);
    out.searchParams.set("reason", providerError);
    if (providerErrorDesc) out.searchParams.set("message", providerErrorDesc);
    return NextResponse.redirect(out);
  }

  if (!code) {
    const out = new URL("/auth/auth-code-error", url.origin);
    out.searchParams.set("reason", "no_code");
    return NextResponse.redirect(out);
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
    const out = new URL("/auth/auth-code-error", url.origin);
    out.searchParams.set("reason", "exchange_failed");
    out.searchParams.set("message", error.message);
    return NextResponse.redirect(out);
  }

  return response;
}
