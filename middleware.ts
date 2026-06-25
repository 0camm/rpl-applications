import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === '/admin/login') return NextResponse.next()
  const session = request.cookies.get('authjs.session-token') || request.cookies.get('__Secure-authjs.session-token')
  if (!session) return NextResponse.redirect(new URL('/admin/login', request.url))
  return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*'] }
