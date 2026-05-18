import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/admin']

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!PROTECTED.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const password = process.env.SITE_PASSWORD
  const cookie = req.cookies.get('site-auth')

  // Kein SITE_PASSWORD gesetzt → trotzdem blocken (fail-closed)
  if (password && cookie?.value === password) {
    return NextResponse.next()
  }

  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = '/locked'
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/admin/:path*'],
}
