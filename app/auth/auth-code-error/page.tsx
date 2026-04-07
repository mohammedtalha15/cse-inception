import Link from "next/link";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export default async function AuthCodeErrorPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const reason = Array.isArray(params.reason) ? params.reason[0] : params.reason;
  const message = Array.isArray(params.message) ? params.message[0] : params.message;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const googleRedirectUri = supabaseUrl
    ? `${supabaseUrl}/auth/v1/callback`
    : "https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-12 font-mono">
      <h1 className="text-lg uppercase tracking-widest">Sign-in did not complete</h1>

      <div className="max-w-lg space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p>
          The OAuth callback could not exchange the code. In Supabase:{" "}
          <strong className="text-foreground">Authentication → Providers → Google</strong> must be
          on, and <strong className="text-foreground">URL Configuration</strong> must list your site
          URL and <code className="text-foreground">/auth/callback</code>.
        </p>
        {(reason || message) && (
          <div className="border border-amber-500/30 bg-amber-500/10 p-4 text-left">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-foreground">
              Current error
            </p>
            {reason && (
              <p className="text-[11px]">
                Reason: <code className="text-foreground">{reason}</code>
              </p>
            )}
            {message && (
              <p className="mt-1 wrap-break-word text-[11px]">
                Message: <span className="text-foreground">{safeDecode(message)}</span>
              </p>
            )}
          </div>
        )}

        <div className="border border-border bg-muted/30 p-4 text-left">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-foreground">
            Google: Error 400 redirect_uri_mismatch
          </p>
          <p className="mb-3">
            Google only allows redirects that you list on the OAuth client. With Supabase, the
            redirect goes to <strong className="text-foreground">Supabase first</strong>, not
            localhost.
          </p>
          <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            Add this exact URI in Google Cloud Console
          </p>
          <code className="block break-all rounded border border-border bg-background p-2 text-[11px] text-accent">
            {googleRedirectUri}
          </code>
          <p className="mt-3 text-[11px]">
            Path: <span className="text-foreground">APIs &amp; Services → Credentials</span> → your{" "}
            <span className="text-foreground">OAuth 2.0 Client ID</span> →{" "}
            <span className="text-foreground">Authorized redirect URIs</span> → Add URI → Save.
          </p>
          <p className="mt-2 text-[11px]">
            Under <span className="text-foreground">Authorized JavaScript origins</span>, add{" "}
            <code className="text-foreground">http://localhost:3000</code> (and your production
            origin when you deploy).
          </p>
        </div>
      </div>

      <Link
        href="/"
        className="border-2 border-foreground bg-foreground px-5 py-2.5 text-[10px] uppercase tracking-widest text-background"
      >
        Home
      </Link>
    </div>
  );
}
