import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  const passthrough = NextResponse.next({ request });

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

  if (!url || !anonKey) {
    console.error(
      `proxy: missing Supabase env vars (url present: ${Boolean(url)}, anonKey present: ${Boolean(anonKey)}) — skipping session refresh`
    );
    return passthrough;
  }

  try {
    let response = passthrough;

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    // Refreshes the auth token cookie if it's expired — required so Server
    // Components reading cookies() see an up-to-date session.
    await supabase.auth.getUser();

    return response;
  } catch (error) {
    // The session-refresh here is a convenience, not the security boundary
    // (app/portal/page.tsx independently checks auth on every request) — a
    // failure here should never take down the whole route.
    console.error('proxy: session refresh failed, passing request through', error);
    return passthrough;
  }
}

export const config = {
  matcher: ['/portal/:path*'],
};
