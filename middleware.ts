import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const path = req.nextUrl.pathname;

  // Simple middleware that just logs - let the client handle auth
  console.log("Middleware - path:", path);

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};

