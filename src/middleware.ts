import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap gate: no session cookie => straight to /login. This only checks the cookie exists; the
 * backend validates the signed token on every API call, so a forged cookie shows an empty shell at most.
 * `warden_noauth` is set by the login page when the backend runs with WARDEN_AUTH_REQUIRED=false.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith("/login")) return NextResponse.next();
  if (req.cookies.has("warden_session") || req.cookies.has("warden_noauth")) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
