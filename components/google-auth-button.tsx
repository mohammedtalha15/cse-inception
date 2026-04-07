"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { AlertCircle, LogIn } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type ConfigResponse =
  | { configured: true; url: string; anonKey: string }
  | { configured: false; url: null; anonKey: null };

export function GoogleAuthButton() {
  const [busy, setBusy] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [creds, setCreds] = useState<{ url: string; anonKey: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/supabase-config", { cache: "no-store" });
        const data = (await res.json()) as ConfigResponse;
        if (cancelled) return;
        if (data.configured && data.url && data.anonKey) {
          setCreds({ url: data.url, anonKey: data.anonKey });
        } else {
          setCreds(null);
        }
      } catch {
        if (!cancelled) setCreds(null);
      } finally {
        if (!cancelled) setLoadingConfig(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSignIn = useCallback(async () => {
    if (!creds || busy) return;
    setAuthError(null);
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient(creds.url, creds.anonKey);
      const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || window.location.origin;
      const callbackUrl = `${siteOrigin.replace(/\/+$/, "")}/auth/callback`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
          queryParams: { prompt: "select_account" },
          skipBrowserRedirect: true,
        },
      });
      if (error) {
        console.error("Google OAuth start failed:", error);
        setAuthError(error.message);
        setBusy(false);
        return;
      }
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      setAuthError("No OAuth URL was returned by Supabase.");
      setBusy(false);
    } catch (e) {
      console.error("Google OAuth start crashed:", e);
      setAuthError(e instanceof Error ? e.message : "Unknown Google auth error");
      setBusy(false);
    }
  }, [creds, busy]);

  if (loadingConfig) {
    return (
      <span className="flex items-center gap-2 border border-foreground/15 bg-background/50 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <LogIn size={14} strokeWidth={1.5} className="opacity-50" />
        Auth…
      </span>
    );
  }

  if (!creds) {
    return (
      <motion.button
        type="button"
        disabled
        title="Set NEXT_PUBLIC_SUPABASE_URL plus NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or server-only SUPABASE_* equivalents), redeploy, enable Google in Supabase Auth, and add redirect URL: https://YOUR_DOMAIN/auth/callback"
        className="flex max-w-[220px] cursor-not-allowed flex-col items-start gap-0.5 border border-dashed border-foreground/25 bg-background/50 px-3 py-2 text-left font-mono text-[9px] uppercase leading-tight tracking-widest text-muted-foreground opacity-80"
      >
        <span className="inline-flex items-center gap-2">
          <LogIn size={14} strokeWidth={1.5} />
          Sign in
        </span>
        <span className="normal-case tracking-normal text-[8px] text-muted-foreground/80">
          Configure Supabase env on the server
        </span>
      </motion.button>
    );
  }

  return (
    <div className="space-y-1">
      <motion.button
        type="button"
        disabled={busy}
        onClick={() => void onSignIn()}
        whileHover={{ scale: busy ? 1 : 1.02 }}
        whileTap={{ scale: busy ? 1 : 0.98 }}
        className="flex items-center gap-2 border border-foreground/20 bg-background/50 px-3 py-2 text-xs font-mono uppercase tracking-widest text-muted-foreground transition-colors duration-200 hover:border-foreground/40 hover:text-foreground disabled:opacity-60"
      >
        <LogIn size={14} strokeWidth={1.5} />
        <span>{busy ? "Redirecting…" : "Sign in"}</span>
      </motion.button>
      {authError && (
        <p className="flex max-w-60 items-start gap-1.5 font-mono text-[9px] leading-relaxed text-amber-600 dark:text-amber-400">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          {authError}. Check Supabase Google provider + callback URLs.
        </p>
      )}
    </div>
  );
}
