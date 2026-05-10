import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/dashboard", "/workspace", "/analytics", "/ai-chat", "/revision-hub", "/player"];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("neurolearn_access_token")?.value;
  const isProtected = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/workspace/:path*", "/analytics/:path*", "/ai-chat/:path*", "/revision-hub/:path*", "/player/:path*"]
};
