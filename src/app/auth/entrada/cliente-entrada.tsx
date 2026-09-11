"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { criarClienteNavegador } from "@/lib/supabase/client";

const MENSAGENS: Record<string, string> = {
  otp_expired:
    "Esse link já foi usado ou passou da validade. Peça ao Chefe para reenviar o convite — cada link vale uma vez só.",
  access_denied:
    "Esse link não é mais válido. Peça ao Chefe para reenviar o convite.",
};

/**
 * Chegada dos links de e-mail do Supabase.
 *
 * Precisa rodar no navegador por um motivo específico: o template padrão de
 * e-mail devolve a sessão no *fragmento* da URL (`#access_token=…`), e o
 * navegador nunca envia fragmento para o servidor. Só código client-side
 * alcança esse valor.
 *
 * Editar o template para mandar o token na query exigiria SMTP próprio
 * configurado — o painel do Supabase trava a edição sem isso. Então o caminho
 * que funciona sem nenhuma configuração extra é este.
 *
 * Quando houver SMTP próprio e o template passar a usar `{{ .TokenHash }}`,
 * os parâmetros chegam na query e a rota de servidor `/auth/confirm` assume.
 */
export function ClienteEntrada() {
  const router = useRouter();
  const parametros = useSearchParams();
  const [erro, setErro] = useState<string | null>(null);

  // StrictMode monta o efeito duas vezes em desenvolvimento, e trocar a sessão
  // duas vezes com o mesmo token faria a segunda falhar.
  const jaProcessou = useRef(false);

  // `set-state-in-effect` desligado de propósito: a regra existe para pegar
  // estado derivado, que deveria ser calculado na renderização. Aqui a origem
  // do dado é `window.location.hash`, que não existe no servidor e portanto
  // não pode ser lido durante a renderização sem quebrar a hidratação. Ler
  // depois da montagem é o único caminho correto.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (jaProcessou.current) return;
    jaProcessou.current = true;

    const seguinte = parametros.get("next");
    const proximo = seguinte?.startsWith("/") ? seguinte : "/";

    const fragmento = new URLSearchParams(
      window.location.hash.replace(/^#/, ""),
    );

    const codigoErro =
      fragmento.get("error_code") ?? parametros.get("error_code");

    if (codigoErro) {
      setErro(
        MENSAGENS[codigoErro] ??
          "Não foi possível validar esse link. Peça ao Chefe para reenviar o convite.",
      );
      return;
    }

    // Formato novo (token na query): quem resolve é a rota de servidor.
    const tokenHash = parametros.get("token_hash");
    const codigo = parametros.get("code");

    if (tokenHash || codigo) {
      const destino = new URLSearchParams(parametros.toString());
      window.location.replace(`/auth/confirm?${destino.toString()}`);
      return;
    }

    const accessToken = fragmento.get("access_token");
    const refreshToken = fragmento.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setErro(
        "Esse link não trouxe um acesso válido. Peça ao Chefe para reenviar o convite.",
      );
      return;
    }

    const supabase = criarClienteNavegador();

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setErro(
            "Esse link já foi usado ou passou da validade. Peça ao Chefe para reenviar o convite.",
          );
          return;
        }

        // Tira o token da barra de endereço antes de seguir: ele não precisa
        // ficar no histórico do navegador.
        window.history.replaceState(null, "", window.location.pathname);
        router.replace(proximo);
        router.refresh();
      });
  }, [parametros, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (erro) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-destructive text-sm leading-relaxed">
          {erro}
        </p>
        <a
          href="/login"
          className="text-sm underline underline-offset-4"
        >
          Ir para a tela de entrada
        </a>
      </div>
    );
  }

  return (
    <p className="text-muted-foreground flex items-center gap-2 text-sm">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      Validando seu convite…
    </p>
  );
}
