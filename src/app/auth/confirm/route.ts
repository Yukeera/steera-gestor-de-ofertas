import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Ponto de chegada de todo link de e-mail: convite, recuperação de senha,
 * confirmação de cadastro.
 *
 * O link do e-mail carrega um token de uso único. Alguém precisa trocá-lo por
 * uma sessão em cookie, e esse alguém é esta rota. Sem ela o token é queimado
 * sem nada do outro lado, e a pessoa vê "link inválido ou expirado".
 *
 * Dois formatos são aceitos porque o Supabase manda um ou outro conforme o
 * template de e-mail e o fluxo configurado:
 *
 *  - `token_hash` + `type` → verifyOtp (formato recomendado para servidor)
 *  - `code`                → exchangeCodeForSession (fluxo PKCE)
 *
 * O formato antigo, que devolve o token no fragmento da URL (`#access_token=`),
 * é impossível de ler aqui: o navegador não manda fragmento para o servidor.
 * Por isso o template precisa usar `{{ .TokenHash }}` (ver docs/SETUP.md).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const destino = (caminho: string) =>
    NextResponse.redirect(new URL(caminho, request.url));

  // O Supabase redireciona para cá com o erro na query quando o próprio
  // endpoint de verify recusa o token.
  const erroSupabase = searchParams.get("error_code");
  if (erroSupabase) {
    return destino(`/login?erro=${encodeURIComponent(erroSupabase)}`);
  }

  // Só caminho relativo: `next` vem da URL e um valor absoluto aqui viraria
  // redirecionamento aberto para fora do app.
  const seguinte = searchParams.get("next");
  const proximo = seguinte?.startsWith("/") ? seguinte : "/";

  const supabase = await criarClienteServidor();

  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({
      type: tipo,
      token_hash: tokenHash,
    });

    if (!error) return destino(proximo);
    return destino(`/login?erro=${encodeURIComponent(error.code ?? "link-invalido")}`);
  }

  const codigo = searchParams.get("code");
  if (codigo) {
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return destino(proximo);
    return destino(`/login?erro=${encodeURIComponent(error.code ?? "link-invalido")}`);
  }

  return destino("/login?erro=link-invalido");
}
