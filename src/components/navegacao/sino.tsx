"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Cog, ListChecks } from "lucide-react";

import { marcarLida, marcarTodasLidas } from "@/actions/notificacoes";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatarData } from "@/lib/data";
import { cn } from "@/lib/utils";

export type Notificacao = {
  id: string;
  tipo: "ETAPA_DELEGADA" | "TAREFA_DESIGNADA";
  titulo: string;
  contexto: string | null;
  href: string;
  lida: boolean;
  criadaEm: string;
};

const DESCRICAO = {
  ETAPA_DELEGADA: { rotulo: "Etapa delegada a você", icone: Cog },
  TAREFA_DESIGNADA: { rotulo: "Tarefa designada a você", icone: ListChecks },
} as const;

export function Sino({ notificacoes }: { notificacoes: Notificacao[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [processando, iniciar] = useTransition();

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  function abrir(item: Notificacao) {
    setAberto(false);
    if (!item.lida) void marcarLida(item.id);
    router.push(item.href);
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell aria-hidden="true" />
          {naoLidas > 0 ? (
            <span
              aria-hidden="true"
              className="bg-marca text-marca-foreground absolute top-1 right-1 flex size-4 items-center justify-center rounded-full font-mono text-[9px] font-semibold tabular"
            >
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          ) : null}
          {/* O número no selo é decorativo; quem lê por leitor de tela recebe
              a contagem aqui, escrita por extenso. */}
          <span className="sr-only">
            {naoLidas === 0
              ? "Notificações, nenhuma nova"
              : `Notificações, ${naoLidas} não lida${naoLidas === 1 ? "" : "s"}`}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <p className="text-sm font-medium">Notificações</p>
          {naoLidas > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={processando}
              onClick={() =>
                iniciar(async () => {
                  await marcarTodasLidas();
                  router.refresh();
                })
              }
            >
              <CheckCheck aria-hidden="true" />
              Marcar lidas
            </Button>
          ) : null}
        </div>

        {notificacoes.length === 0 ? (
          <p className="text-muted-foreground px-3 py-8 text-center text-sm leading-relaxed">
            Nada por aqui. Quando alguém delegar uma etapa ou designar uma
            tarefa a você, aparece aqui.
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {notificacoes.map((item) => {
              const { rotulo, icone: Icone } = DESCRICAO[item.tipo];

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => abrir(item)}
                    className={cn(
                      "hover:bg-accent focus-visible:ring-ring flex w-full items-start gap-2.5 border-b px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      !item.lida && "bg-marca/5",
                    )}
                  >
                    <Icone
                      className="text-muted-foreground mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-muted-foreground block text-[11px]">
                        {rotulo}
                      </span>
                      <span className="block text-sm leading-snug font-medium">
                        {item.titulo}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {item.contexto ? `${item.contexto} · ` : ""}
                        <time dateTime={item.criadaEm} className="tabular">
                          {formatarData(item.criadaEm)}
                        </time>
                      </span>
                    </span>
                    {!item.lida ? (
                      <span
                        aria-hidden="true"
                        className="bg-marca mt-1.5 size-2 shrink-0 rounded-full"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="px-3 py-2">
          <Link
            href="/"
            onClick={() => setAberto(false)}
            className="text-muted-foreground text-xs underline-offset-4 hover:underline"
          >
            Ver tudo que é seu na tela Hoje
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
