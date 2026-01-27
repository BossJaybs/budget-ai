import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const path = req.nextUrl.pathname;

  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set(name, value, options);
        },
        remove(name: string, options: any) {
          res.cookies.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );

  // Check if path starts with /admin
  if (path.startsWith("/admin")) {
    // Allow access to admin login page
    if (path === "/admin/login") {
      return res;
    }

    // Check for simple admin session (demo purposes)
    const adminSession = req.cookies.get("admin_session")?.value;
    if (adminSession === "true") {
      return res;
    }

    // Otherwise, check Supabase auth and role
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Redirect to admin login for demo
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    // Check user role from database
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "ADMIN") {
      // Redirect to dashboard if not admin
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login"],
};

