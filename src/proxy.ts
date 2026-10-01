import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO } from "@/lib/auth-cookie";

// Checagem otimista: sem cookie de sessão, manda para o login.
// A validação real da sessão acontece em exigirUsuario() nas páginas e server actions.
export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Rotas públicas: o logo da loja e os avisos do Asaas e da rotina diária (que têm a própria senha).
  const publica = pathname === "/login" || ["/logo/", "/api/asaas/", "/api/cron/"].some((p) => pathname.startsWith(p));
  if (!req.cookies.has(COOKIE_SESSAO) && !publica) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
