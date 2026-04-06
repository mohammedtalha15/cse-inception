import { NextResponse } from "next/server";
import { getSupabaseCredentials } from "@/lib/supabase/env-server";

/**
 * Runtime config for the browser Supabase client. Anon key is public by design (RLS protects data).
 */
export async function GET() {
  const creds = getSupabaseCredentials();
  if (!creds) {
    return NextResponse.json({
      configured: false as const,
      url: null as string | null,
      anonKey: null as string | null,
    });
  }
  return NextResponse.json({
    configured: true as const,
    url: creds.url,
    anonKey: creds.anonKey,
  });
}
