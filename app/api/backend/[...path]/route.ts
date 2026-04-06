import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** Allow chat/Gemini through typical serverless limits when the host supports it. */
export const maxDuration = 25;

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
]);

/**
 * Backend base URL read at **request time** (not build time), so Vercel/host env
 * changes apply without rebuilding. Rewrites in next.config only see build-time env.
 */
function backendBase(): string {
  const raw =
    process.env.BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "http://127.0.0.1:8000";
  return raw.replace(/\/+$/, "");
}

async function proxy(req: NextRequest, segments: string[]): Promise<NextResponse> {
  const base = backendBase();
  const sub = segments.length > 0 ? segments.map(encodeURIComponent).join("/") : "";
  const destPath = sub ? `${base}/${sub}` : `${base}/`;
  const src = new URL(req.url);
  const dest = `${destPath}${src.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    headers.set(key, value);
  });

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (!["GET", "HEAD"].includes(req.method)) {
    init.body = await req.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(dest, init);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        detail: `Cannot reach API at ${base} (${msg}). Set BACKEND_URL (or NEXT_PUBLIC_API_URL) in the host environment to your live FastAPI HTTPS URL.`,
      },
      { status: 502 },
    );
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    out.set(key, value);
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: out,
  });
}

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path = [] } = await ctx.params;
  return proxy(req, path);
}

export async function HEAD(req: NextRequest, ctx: Ctx) {
  const { path = [] } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path = [] } = await ctx.params;
  return proxy(req, path);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { path = [] } = await ctx.params;
  return proxy(req, path);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { path = [] } = await ctx.params;
  return proxy(req, path);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { path = [] } = await ctx.params;
  return proxy(req, path);
}
