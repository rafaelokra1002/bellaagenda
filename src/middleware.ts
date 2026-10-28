import { NextResponse, type NextRequest } from "next/server";

/**
 * Filtro rápido: sem cookie de sessão, nem renderiza o painel.
 * A validação real (sessão no banco, expiração, dona dos dados) acontece no
 * servidor, em requireAuth() e em adminRoute().
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.get("bella_session")?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/painel/:path*"] };
