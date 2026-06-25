import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Never redirect login or auth routes
  if (pathname === '/admin/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const session =
    request.cookies.get('authjs.session-token') ||
    request.cookies.get('__Secure-authjs.session-token')

  if (!session) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Exclude /admin/login explicitly from the matcher
  matcher: ['/admin/((?!login).*)'],
}
