import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Cheap guard to avoid flashing protected pages: no "session" cookie -> go to sign-in.
 * (Next.js 16 renamed middleware.ts to proxy.ts.) The real check is still GET /auth/me in useAuth.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/route53/:path*"],
};
