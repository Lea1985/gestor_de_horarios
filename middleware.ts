import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {

  let tenantId = request.headers.get('x-institucion-id')

  // fallback a subdominio
  if (!tenantId) {

    const host = request.headers.get('host') || ''

    const subdomain = host.split('.')[0]

    if (subdomain && subdomain !== 'localhost') {
      tenantId = subdomain
    }

  }

  if (!tenantId) {
    return NextResponse.json(
      { error: "Tenant no definido" },
      { status: 400 }
    )
  }

  const requestHeaders = new Headers(request.headers)

  requestHeaders.set('tenant-id', tenantId)

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  })
}

export const config = {
  matcher: ['/api/:path*']
}