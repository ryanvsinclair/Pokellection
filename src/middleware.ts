import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isBuyerAuthRequiredPath } from "@/lib/buyer-auth-paths";

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

function loginRedirect(
  request: NextRequest,
  returnPath: string,
  session?: NextResponse,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("redirect", returnPath);
  const response = NextResponse.redirect(url);
  return session ? withSessionCookies(session, response) : response;
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");

  if (!supabaseUrl || !supabaseKey) {
    if (isAdminRoute) {
      return loginRedirect(request, pathname);
    }
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

    const sessionUser = authError ? null : user;

    const isManagerLogin = pathname === "/login";
    const isAccountAuthRoute =
      pathname === "/account/login" || pathname === "/account/signup";
    const isAccountRoute = pathname.startsWith("/account");
    const requiresBuyerAccount = isBuyerAuthRequiredPath(pathname);

    const profileRole = (sessionUser?.app_metadata?.role as UserRole | undefined) ?? null;

    if (isAdminRoute) {
      if (!sessionUser) {
        return loginRedirect(request, pathname, supabaseResponse);
      }
      if (!isManager(profileRole)) {
        return redirect(request, "/account", supabaseResponse);
      }
    }

    if (isManagerLogin && sessionUser && isManager(profileRole)) {
      return redirect(request, "/admin", supabaseResponse);
    }

    if (isManagerLogin && sessionUser && isBuyer(profileRole)) {
      return redirect(request, "/account", supabaseResponse);
    }

    if (requiresBuyerAccount) {
      if (!sessionUser) {
        return redirect(request, "/account/signup", supabaseResponse, { redirect: pathname });
      }
      if (!isBuyer(profileRole)) {
        return redirect(request, "/account", supabaseResponse);
      }
    }

    if (isAccountRoute && !isAccountAuthRoute) {
      if (!sessionUser) {
        return redirect(request, "/account/login", supabaseResponse, { redirect: pathname });
      }
    }

    if (isAccountAuthRoute && sessionUser && isBuyer(profileRole)) {
      return redirect(request, "/account", supabaseResponse);
    }

    if (isAccountAuthRoute && sessionUser && isManager(profileRole)) {
      return redirect(request, "/login", supabaseResponse);
    }

    return supabaseResponse;
  } catch {
    if (isAdminRoute) {
      return loginRedirect(request, pathname);
    }
    return NextResponse.next({ request });
  }
}

export const config = {
  // Must be in `config`, not `export const runtime` — top-level runtime breaks
  // Vercel Node middleware (ESM/CJS load error). Node avoids Edge __dirname crash.
  runtime: "nodejs",
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
