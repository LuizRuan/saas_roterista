import { NextResponse, type NextRequest } from "next/server";

/**
 * SEC-01: Middleware Edge do Next.js — proteção de rotas autenticadas.
 *
 * Verifica se o cookie de refresh token existe (indicador de sessão).
 * Não é prova de autenticação (a API valida o JWT real), mas filtra
 * 99% dos acessos indevidos antes de carregar o JavaScript da página.
 *
 * Sem isso, páginas como /dashboard, /designer e /admin servem o
 * HTML/JS completo para visitantes não autenticados antes do redirect
 * client-side acontecer.
 */

const ROTAS_PROTEGIDAS = ["/dashboard", "/designer", "/roteiros", "/configuracoes", "/planos"];
const ROTAS_ADMIN = ["/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cookie de refresh = indicador de sessão ativa
  const temSessao = request.cookies.has("gancho_refresh");

  const ehProtegida = ROTAS_PROTEGIDAS.some((r) => pathname.startsWith(r));
  const ehAdmin = ROTAS_ADMIN.some((r) => pathname.startsWith(r));

  if ((ehProtegida || ehAdmin) && !temSessao) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/designer/:path*",
    "/roteiros/:path*",
    "/configuracoes/:path*",
    "/admin/:path*",
  ],
};
