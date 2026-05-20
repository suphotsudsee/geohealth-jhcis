import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const publicPaths = [
  '/',
  '/login',
  '/dashboard',
  '/analytics',
  '/households',
  '/patients',
  '/ffc',
  '/reports',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/health',
]

const publicReadApiPrefixes = [
  '/api/v1/analytics',
  '/api/v1/map',
  '/api/v1/patients',
  '/api/v1/houses',
  '/api/v1/villages',
  '/api/v1/ffc',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public paths
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next()
  }

  if (
    request.method === 'GET' &&
    publicReadApiPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next()
  }

  // Verify JWT
  const token =
    request.cookies.get('accessToken')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '')

  if (!token) {
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'ไม่ได้รับอนุญาต' },
        },
        { status: 401 }
      )
    }
    // For pages, redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const payload = verifyToken(token)
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Token หมดอายุ' },
        },
        { status: 401 }
      )
    }
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Set user info header for API routes
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.userId)
  requestHeaders.set('x-user-role', payload.role)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)',
  ],
}
