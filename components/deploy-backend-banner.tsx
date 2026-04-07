/**
 * Server component: on Vercel, warn when no backend URL is configured for /api/backend proxy.
 */
export function DeployBackendBanner() {
  const onVercel = process.env.VERCEL === "1";
  const hasBackend =
    Boolean(process.env.BACKEND_URL?.trim()) ||
    Boolean(process.env.NEXT_PUBLIC_API_URL?.trim());

  if (!onVercel || hasBackend) return null;

  return (
    <div
      role="status"
      className="mb-6 border border-amber-500/40 bg-amber-500/10 px-4 py-3 font-mono text-[11px] leading-relaxed text-amber-200/90"
    >
      <strong className="text-amber-100">Production API not configured.</strong> Set{" "}
      <code className="text-foreground/90">BACKEND_URL</code> (preferred) or{" "}
      <code className="text-foreground/90">NEXT_PUBLIC_API_URL</code> in the Vercel project
      environment to your <strong>public HTTPS</strong> FastAPI base URL (no trailing slash),
      then redeploy. Without it, requests fall back to <code>127.0.0.1:8000</code> and fail — you
      will see “HTML instead of JSON” errors when submitting vitals.
    </div>
  );
}
