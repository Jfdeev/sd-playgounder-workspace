import { NextResponse, type NextRequest } from 'next/server';
import { PATHNAME_HEADER } from './lib/designs/return-path';

// M4.1: o layout de /app não sabe a URL da página; sem sessão ele redireciona pro login e, sem isso,
// perderia o destino (ex.: link de design compartilhado). Só repassa o caminho num header — quem
// valida o retorno é `safeReturnPath` em /entrar.
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(PATHNAME_HEADER, request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ['/app/:path*'] };
