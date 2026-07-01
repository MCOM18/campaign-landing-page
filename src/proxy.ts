import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Intercept paths containing /link= and rewrite to root /
  // This handles URLs like: /link=https:/jojoapp.in?data=...
  if (pathname.includes('/link=')) {
    const url = request.nextUrl.clone();
    // Keep the original pathname so the client can parse /link=... from it
    // Just rewrite to / while preserving the full search string
    url.pathname = '/';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|assets|favicon.ico).*)',
  ],
};
