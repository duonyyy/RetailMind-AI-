import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Edge Middleware Guard (ADR-009 Section 2.4)
 * - Injects `x-trace-id` and `x-correlation-id` for end-to-end OpenTelemetry tracing
 * - Enforces persona role boundary on `/admin/*` when explicit guest/customer role cookie is set to restricted mode
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const traceId =
    req.headers.get('x-trace-id') ||
    `tr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-trace-id', traceId);
  requestHeaders.set('x-correlation-id', traceId);

  // Enforce strict role check if retailmind_strict_rbac cookie is enabled
  const strictMode = req.cookies.get('retailmind_strict_rbac')?.value === 'true';
  const currentRole = req.cookies.get('retailmind_role')?.value || 'admin';

  if (strictMode && pathname.startsWith('/admin') && currentRole !== 'admin') {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('reason', 'admin_required');
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('x-trace-id', traceId);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|brand/).*)'],
};

