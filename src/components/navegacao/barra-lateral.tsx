"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";

import { MarcaSteera } from "@/components/marca";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { ITENS_NAVEGACAO, itemEstaAtivo } from "./itens";

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
      </SheetContent>
    </Sheet>
  );
}
