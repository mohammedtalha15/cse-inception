/**
 * Resolve Supabase URL + public client key on the server (middleware, route handlers).
 * Accepts legacy anon JWT (`*_ANON_KEY`) or newer publishable keys (`*_PUBLISHABLE_*`).
 */
function firstNonEmpty(...vals: (string | undefined)[]): string {
  for (const v of vals) {
    const s = v?.trim();
    if (s) return s;
  }
  return "";
}

export function getSupabaseCredentials(): { url: string; anonKey: string } | null {
  const url = firstNonEmpty(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL,
  );
  const anonKey = firstNonEmpty(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
  );
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
