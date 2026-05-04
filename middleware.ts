import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/funnel-overview']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!PROTECTED.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const cookie = req.cookies.get('site-auth')
  const password = process.env.SITE_PASSWORD

  if (!password || (cookie?.value === password)) {
    return NextResponse.next()
  }

  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = '/locked'
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/funnel-overview/:path*'],
}
