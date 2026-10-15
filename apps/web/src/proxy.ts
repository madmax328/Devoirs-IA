import { NextResponse, type NextRequest } from "next/server";

/**
 * CORS pour l'API, limité aux origines de TRUSTED_ORIGINS (ex. Expo web en développement).
 * Les apps natives iOS/Android n'envoient pas d'en-tête Origin et ne sont pas concernées.
 */
function allowedOrigins(): string[] {
  return (process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.startsWith("http"));
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowed = origin !== null && allowedOrigins().includes(origin);

  if (request.method === "OPTIONS") {
    if (!allowed) return new NextResponse(null, { status: 403 });
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }
  const res = NextResponse.next();
  if (allowed) for (const [k, v] of Object.entries(corsHeaders(origin))) res.headers.set(k, v);
  return res;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "content-type,x-child-session",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export const config = { matcher: "/api/:path*" };
