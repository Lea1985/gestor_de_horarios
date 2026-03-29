import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {

  const pathname = request.nextUrl.pathname

  // ================================
  // 🟢 BYPASS CONTROLADO
  // Solo para crear instituciones (no requiere tenant)
  // ================================
  if (
    pathname.startsWith('/api/instituciones') &&
    request.method === 'POST'
  ) {
    return NextResponse.next()
  }

  // ================================
  // 🧠 OBTENER TENANT DESDE HEADERS
  // ================================
  let tenantId =
    request.headers.get('x-tenant-id') ||
    request.headers.get('x-institucion-id')

  // ================================
  // 🌐 FALLBACK: SUBDOMINIO
  // ================================
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

  // ================================
  // 🔴 BLOQUEO DURO (clave de seguridad)
  // ================================
  if (!tenantId) {
    return NextResponse.json(
      { error: 'Tenant no definido' },
      { status: 400 }
    )
  }

  // ================================
  // 🧠 NORMALIZAR HEADER
  // ================================
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('tenant-id', tenantId)

  // ================================
  // 🚀 CONTINUAR REQUEST
  // ================================
  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  })
}

// ================================
// 🎯 APLICAR SOLO A /api
// ================================
export const config = {
  matcher: ['/api/:path*']
}