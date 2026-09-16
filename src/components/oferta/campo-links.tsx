"use client";

import { useId, useState } from "react";
import { Link2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Aceita o que a pessoa realmente cola.
 *
 * Copiar da barra de endereço às vezes vem sem `https://`, e exigir que ela
 * digite o protocolo à mão não protege de nada — só irrita. O que importa é
 * recusar o que não é endereço nenhum.
 */
function normalizar(bruto: string): { url: string } | { erro: string } {
  const texto = bruto.trim();
  if (!texto) return { erro: "Cole o link do criativo." };

  const completo = /^https?:\/\//i.test(texto) ? texto : `https://${texto}`;

  let endereco: URL;
  try {
    endereco = new URL(completo);
  } catch {
    return { erro: "Isso não parece um link." };
  }

  // `new URL("https://abc")` passa, e "abc" não é lugar nenhum.
  if (!endereco.hostname.includes(".")) {
    return { erro: "Isso não parece um link." };
  }

  return { url: endereco.toString() };
}

/**
 * Identidade do link para efeito de repetição.
 *
 * O mesmo anúncio copiado de lugares diferentes chega escrito diferente —
 * com e sem `www.`, com e sem barra no fim. Guardamos o endereço como veio,
 * mas comparamos por esta chave: senão a lista mostra duas linhas que a
 * pessoa lê como iguais e não entende por que estão ali duas vezes.
 */
function chave(url: string): string {
  try {
    const { hostname, pathname, search } = new URL(url);
    return [
      hostname.toLowerCase().replace(/^www\./, ""),
      pathname.replace(/\/+$/, ""),
      search,
    ].join("");
  } catch {
    return url;
  }
}

/** Quebra o link para exibir o domínio em destaque e o resto apagado. */
function partes(url: string) {
  try {
    const { hostname, pathname, search } = new URL(url);
    return {
      dominio: hostname.replace(/^www\./, ""),
      resto: `${pathname}${search}`.replace(/^\/$/, ""),
    };
  } catch {
    return { dominio: url, resto: "" };
  }
}

/**
 * Lista de links que cresce conforme a pessoa cola.
 *
 * Os links ficam no estado do componente e viajam com o formulário, igual às
 * imagens: ideia que ainda não foi salva não deve deixar linha no banco.
 */
export function CampoLinks({
  rotulo,
  ajuda,
  marcador,
  valor,
  aoMudar,
}: {
  rotulo: string;
  ajuda?: string;
  marcador?: string;
  valor: string[];
  aoMudar: (links: string[]) => void;
}) {
  const [rascunho, setRascunho] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const idCampo = useId();
  const idErro = useId();

  function adicionar() {
    const analise = normalizar(rascunho);

    if ("erro" in analise) {
      setErro(analise.erro);
      return;
    }

    const nova = chave(analise.url);
    if (valor.some((existente) => chave(existente) === nova)) {
      setErro("Esse link já está na lista.");
      return;
    }

    aoMudar([...valor, analise.url]);
    setRascunho("");
    setErro(null);
  }

  return (
    <div className="space-y-2">
      <label htmlFor={idCampo} className="text-sm font-medium">
        {rotulo}
      </label>

      {ajuda ? <p className="text-muted-foreground text-xs">{ajuda}</p> : null}

      <div className="flex gap-2">
        <Input
          id={idCampo}
          value={rascunho}
          onChange={(evento) => {
            setRascunho(evento.target.value);
            if (erro) setErro(null);
          }}
          // Enter aqui adiciona o link. Sem isto o Enter enviaria o formulário
          // inteiro e guardaria a ideia sem o link que estava sendo digitado.
          onKeyDown={(evento) => {
            if (evento.key !== "Enter") return;
            evento.preventDefault();
            adicionar();
          }}
          type="url"
          inputMode="url"
          placeholder={marcador ?? "https://…"}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idErro : undefined}
        />
        <Button type="button" variant="secondary" onClick={adicionar}>
          <Plus aria-hidden="true" />
          Adicionar
        </Button>
      </div>

      {erro ? (
        <p id={idErro} role="alert" className="text-destructive text-xs">
          {erro}
        </p>
      ) : null}

      {valor.length > 0 ? (
        <ul className="space-y-1.5">
          {valor.map((link) => {
            const { dominio, resto } = partes(link);
            return (
              <li
                key={link}
                className="bg-card flex items-center gap-2 rounded-md border px-3 py-2"
              >
                <Link2
                  className="text-muted-foreground size-4 shrink-0"
                  aria-hidden="true"
                />
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-sm underline-offset-4 hover:underline"
                >
                  <span className="font-medium">{dominio}</span>
                  <span className="text-muted-foreground">{resto}</span>
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => aoMudar(valor.filter((l) => l !== link))}
                >
                  <X className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">Remover {dominio}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
