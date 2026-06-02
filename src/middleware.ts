import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type UserRole = "manager" | "buyer";

function isManager(role: UserRole | null): boolean {
  return role === "manager";
}

function isBuyer(role: UserRole | null): boolean {
  return role === "buyer";
}

/** Copy refreshed session cookies onto redirect responses. */
function withSessionCookies(from: NextResponse, to: NextResponse): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

function redirect(request: NextRequest, pathname: string, session: NextResponse, searchParams?: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  return withSessionCookies(session, NextResponse.redirect(url));
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  try {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Do not call request.cookies.set — it throws on Vercel Edge (Next.js 15).
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return supabaseResponse;
    }

    const pathname = request.nextUrl.pathname;
    const isAdminRoute = pathname.startsWith("/admin");
    const isManagerLogin = pathname === "/login";
    const isAccountAuthRoute =
      pathname === "/account/login" || pathname === "/account/signup";
    const isAccountRoute = pathname.startsWith("/account");
    const isCheckout = pathname === "/checkout";

    const profileRole = (user?.app_metadata?.role as UserRole | undefined) ?? null;

    if (isAdminRoute) {
      if (!user) {
        return redirect(request, "/login", supabaseResponse, { redirect: pathname });
      }
      if (!isManager(profileRole)) {
        return redirect(request, "/account", supabaseResponse);
      }
    }

    if (isManagerLogin && user && isManager(profileRole)) {
      return redirect(request, "/admin", supabaseResponse);
    }

    if (isManagerLogin && user && isBuyer(profileRole)) {
      return redirect(request, "/account", supabaseResponse);
    }

    if ((isAccountRoute && !isAccountAuthRoute) || isCheckout) {
      if (!user) {
        return redirect(request, "/account/login", supabaseResponse, { redirect: pathname });
      }
    }

    if (isAccountAuthRoute && user && isBuyer(profileRole)) {
      return redirect(request, "/account", supabaseResponse);
    }

    if (isAccountAuthRoute && user && isManager(profileRole)) {
      return redirect(request, "/login", supabaseResponse);
    }

    return supabaseResponse;
  } catch {
    return NextResponse.next({ request });
  }
}

export const config = {
  // Edge on Vercel can throw `ReferenceError: __dirname is not defined` via
  // next/server → ua-parser-js when the project isn't built as Next.js.
  runtime: "nodejs",
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
