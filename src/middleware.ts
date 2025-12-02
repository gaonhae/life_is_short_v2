import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url);
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if exists
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is not logged in and trying to access protected routes
  if (
    !user &&
    (requestUrl.pathname.startsWith('/upload') || requestUrl.pathname.startsWith('/results'))
  ) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user is logged in and trying to access auth routes
  if (
    user &&
    (requestUrl.pathname.startsWith('/login') || requestUrl.pathname.startsWith('/signup'))
  ) {
    return NextResponse.redirect(new URL('/upload', request.url));
  }

  // Redirect root to /upload if authenticated
  if (user && requestUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/upload', request.url));
  }

  // Redirect root to /login if not authenticated
  if (!user && requestUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
