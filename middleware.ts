import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  const response = NextResponse.next();

  // Add optimized cache headers for app routes
  // Allow caching but require revalidation for dynamic content
  response.headers.set("Cache-Control", "private, max-age=0, must-revalidate");

  return response;
}

export const config = {
  matcher: [
    // Target specific routes that need middleware processing
    "/",
    "/dashboard/:path*",
    "/auth/:path*",
    "/account/:path*",
    "/admin/:path*",
    "/groups/:path*",
    "/servers/:path*",
    "/docs/:path*",
  ],
};
