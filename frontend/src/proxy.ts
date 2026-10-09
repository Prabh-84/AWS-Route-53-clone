import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 1. /api/* is forwarded to the FastAPI backend. Done here rather than in next.config rewrites because
 *    those are resolved at build time; reading BACKEND_URL per request lets one built image run anywhere.
 *    The browser only ever talks to this origin, so the session cookie stays same-origin.
 * 2. /route53/* without a "session" cookie goes to sign-in. This is only a cheap guard against flashing
 *    protected pages (Next.js 16 renamed middleware.ts to proxy.ts); the real check is GET /auth/me.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const backend = process.env.BACKEND_URL ?? "http://localhost:8000";
    return NextResponse.rewrite(new URL(`${pathname}${search}`, backend));
  }

  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/route53/:path*"],
};
