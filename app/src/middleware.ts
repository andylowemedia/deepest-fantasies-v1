import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const ageVerified = request.cookies.get("age-verified");
  const { pathname } = request.nextUrl;

  const isExcluded =
    pathname.startsWith("/age-gate") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (!ageVerified && !isExcluded) {
    const url = request.nextUrl.clone();
    url.pathname = "/age-gate";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};