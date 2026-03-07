import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {

  let tenantId = request.headers.get('x-institucion-id')

  if (!tenantId) {

    const host =
      request.headers.get('x-forwarded-host') ||
      request.headers.get('host') ||
      ''

    const hostname = host.split(':')[0]
    const subdomain = hostname.split('.')[0]

    if (
      hostname !== 'localhost' &&
      hostname !== '127.0.0.1' &&
      subdomain
    ) {
      tenantId = subdomain
    }
  }

  if (!tenantId) {
    return new Response(
      JSON.stringify({ error: "Tenant no definido" }),
      {
        status: 400,
        headers: { 'content-type': 'application/json' }
      }
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