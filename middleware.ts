import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  normalizeSupabaseAnonKey,
  normalizeSupabaseUrl,
} from "@/lib/supabase/env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PUBLIC_PATHS = ["/", "/login", "/signup", "/auth/callback"];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/health")
  );
}

/** Copy cookies refreshed by Supabase onto another response (e.g. redirect). */
function copyCookiesTo(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

export async function middleware(request: NextRequest) {
  try {
    return await runMiddleware(request);
  } catch (e) {
    console.error("[middleware] fatal:", e);
    if (isPublicPath(request.nextUrl.pathname)) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
}

async function runMiddleware(request: NextRequest) {
  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = normalizeSupabaseAnonKey(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Configuration required</title><style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1.25rem;line-height:1.5;color:#111;background:#fafafa}code{background:#eee;padding:.15rem .35rem;border-radius:4px}</style></head><body><h1>Configuration required</h1><p>Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> on Vercel (Project → Settings → Environment Variables), then redeploy.</p></body></html>`;
    return new NextResponse(html, {
      status: 503,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: CookieToSet[],
        headers?: Record<string, string | string[]>,
      ) {
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            if (typeof value === "string") response.headers.set(key, value);
          });
        }
      },
    },
  });

  // Use getSession (cookie-backed) instead of getUser() here: getUser hits the
  // Auth HTTP API and is a common source of Edge timeouts / hard failures on
  // Vercel (MIDDLEWARE_INVOCATION_FAILED). RLS + server routes still enforce data access.
  let sessionUserId: string | undefined;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("[middleware] getSession:", error.message);
    } else {
      sessionUserId = data.session?.user?.id;
    }
  } catch (e) {
    console.warn("[middleware] getSession threw:", e);
  }

  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);

  if (!sessionUserId && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    copyCookiesTo(response, redirect);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|backgrounds|.*\\..*).*)"],
};
