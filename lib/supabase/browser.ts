"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient(url: string, anonKey: string) {
  if (!url?.trim() || !anonKey?.trim()) {
    throw new Error("Supabase URL and anon key are required");
  }
  return createBrowserClient(url.trim(), anonKey.trim());
}
