import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { envPublico } from "@/lib/env";

const ROTAS_PUBLICAS = ["/login", "/auth"];
const ROTA_CONFIGURACAO = "/configuracao-pendente";

/**
 * Renova a sessão do Supabase a cada request e barra quem não está logado.
 *
 * É a primeira camada, não a única: o RLS no banco continua sendo a barreira
 * real. Aqui só evitamos renderizar telas para quem não deveria vê-las.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Clone novo, sem .env.local preenchido: em vez de estourar um erro de
  // validação em toda requisição, manda para uma tela que explica o que fazer.
  let env;
  try {
    env = envPublico();
  } catch {
    if (request.nextUrl.pathname === ROTA_CONFIGURACAO) return response;
    const url = request.nextUrl.clone();
    url.pathname = ROTA_CONFIGURACAO;
    url.search = "";
    return NextResponse.rewrite(url);
  }

  if (request.nextUrl.pathname === ROTA_CONFIGURACAO) {
    // Já configurado: a tela de setup não tem mais razão de existir.
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() valida o token no servidor do Supabase. getSession() apenas lê o
  // cookie e confiaria num token forjado — por isso não serve aqui.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = request.nextUrl.pathname;
  const ehPublica = ROTAS_PUBLICAS.some((rota) => caminho.startsWith(rota));

  if (!user && !ehPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Preserva o destino para devolver a pessoa ao lugar certo após o login.
    url.searchParams.set("proximo", caminho);
    return NextResponse.redirect(url);
  }

  if (user && caminho === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Tudo, menos estáticos e imagens — esses não precisam de sessão e
     * passar por aqui só adicionaria latência.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
