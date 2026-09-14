"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarOff, ListOrdered } from "lucide-react";

import { cn } from "@/lib/utils";

const ABAS = [
  {
    href: "/configuracoes/roteiros",
    rotulo: "Roteiros de Montagem",
    icone: ListOrdered,
    soChefe: false,
  },
  {
    href: "/configuracoes/feriados",
    rotulo: "Feriados",
    icone: CalendarOff,
    soChefe: true,
  },
] as const;

export function AbasDeConfiguracao({ ehChefe }: { ehChefe: boolean }) {
  const caminho = usePathname();

  return (
    <nav aria-label="Seções de configuração" className="flex flex-wrap gap-1">
      {ABAS.filter((aba) => !aba.soChefe || ehChefe).map((aba) => {
        const ativa = caminho.startsWith(aba.href);
        const Icone = aba.icone;

        return (
          <Link
            key={aba.href}
            href={aba.href}
            aria-current={ativa ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
              ativa
                ? "bg-secondary text-secondary-foreground font-medium"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            <Icone className="size-4" aria-hidden="true" />
            {aba.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
