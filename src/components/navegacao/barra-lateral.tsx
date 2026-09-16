"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Menu } from "lucide-react";

import { MarcaSteera } from "@/components/marca";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { APPS_EXTERNOS } from "./externos";
import { ITENS_NAVEGACAO, itemEstaAtivo } from "./itens";

/**
 * Rodapé com as outras aplicações da operação.
 *
 * Fica separado da navegação de propósito: são endereços fora do Steera, e
 * misturá-los com as telas faria a pessoa clicar esperando continuar aqui.
 * Por isso `<a>` e não `<Link>` — não há rota interna para pré-carregar — e
 * por isso o ícone de link externo, que é o sinal visual do que vai acontecer.
 */
function AppsDaOperacao({ aoNavegar }: { aoNavegar?: () => void }) {
  return (
    <div className="border-sidebar-border mt-auto border-t p-3">
      <p className="text-muted-foreground px-3 pb-1.5 text-xs font-medium tracking-wide uppercase">
        Nossa operação
      </p>

      {APPS_EXTERNOS.map((app) => {
        const Icone = app.icone;

        return (
          <a
            key={app.href}
            href={app.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={aoNavegar}
            className={cn(
              "text-muted-foreground group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            )}
          >
            <Icone className="size-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">
              {app.rotulo}
              {/* O ícone sozinho não chega ao leitor de tela. */}
              <span className="sr-only"> (abre em nova aba)</span>
            </span>
            <ExternalLink
              className="size-3.5 shrink-0 opacity-50 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            />
          </a>
        );
      })}
    </div>
  );
}

function ListaDeLinks({
  podeVerRestrito,
  aoNavegar,
}: {
  podeVerRestrito: boolean;
  aoNavegar?: () => void;
}) {
  const caminho = usePathname();

  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-1 p-3">
      {ITENS_NAVEGACAO.filter(
        (item) => !item.restrito || podeVerRestrito,
      ).map((item) => {
        const ativo = itemEstaAtivo(item.href, caminho);
        const Icone = item.icone;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={aoNavegar}
            // `nav-state-active`: a posição atual precisa ser visível por mais
            // de um sinal — aqui, barra da marca + peso + contraste de fundo.
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
              ativo
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            {ativo ? (
              <span
                aria-hidden="true"
                className="bg-marca absolute inset-y-1.5 left-0 w-0.5 rounded-full"
              />
            ) : null}
            <Icone className="size-5 shrink-0" aria-hidden="true" />
            {item.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}

/** Sidebar fixa a partir de 1024px (`adaptive-navigation`). */
export function BarraLateral({ podeVerRestrito }: { podeVerRestrito: boolean }) {
  return (
    <aside className="bg-sidebar border-sidebar-border hidden w-60 shrink-0 border-r lg:flex lg:flex-col">
      <div className="flex h-14 items-center px-5">
        <Link
          href="/"
          className="focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none"
        >
          <MarcaSteera />
        </Link>
      </div>
      <ListaDeLinks podeVerRestrito={podeVerRestrito} />
      <AppsDaOperacao />
    </aside>
  );
}

/** Abaixo de 1024px a mesma navegação vira gaveta. */
export function NavegacaoMovel({
  podeVerRestrito,
}: {
  podeVerRestrito: boolean;
}) {
  const [aberta, setAberta] = useState(false);

  return (
    <Sheet open={aberta} onOpenChange={setAberta}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu aria-hidden="true" />
          <span className="sr-only">Abrir navegação</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">Navegação principal</SheetTitle>
        <div className="flex h-14 items-center px-5">
          <MarcaSteera />
        </div>
        <ListaDeLinks
          podeVerRestrito={podeVerRestrito}
          aoNavegar={() => setAberta(false)}
        />
        <AppsDaOperacao aoNavegar={() => setAberta(false)} />
      </SheetContent>
    </Sheet>
  );
}
