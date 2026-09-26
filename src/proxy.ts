import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO } from "@/lib/auth-cookie";

// Checagem otimista: sem cookie de sessão, manda para o login.
// A validação real da sessão acontece em exigirUsuario() nas páginas e server actions.
export default function proxy(req: NextRequest) {
  if (!req.cookies.has(COOKIE_SESSAO) && req.nextUrl.pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
