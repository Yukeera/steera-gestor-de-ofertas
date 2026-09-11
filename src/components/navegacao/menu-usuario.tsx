"use client";

import { useTheme } from "next-themes";
import { LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react";
import Link from "next/link";

import { sair } from "@/actions/auth";
import { AvatarMembro } from "@/components/equipe/avatar-membro";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CARGO_LABEL, FUNCAO_LABEL } from "@/lib/dominio/tipos";
import type { MembroSessao } from "@/lib/auth/sessao";

export function MenuUsuario({ membro }: { membro: MembroSessao }) {
  const { theme, setTheme } = useTheme();

  const funcoes = membro.funcoes.map((f) => FUNCAO_LABEL[f]).join(" · ");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <AvatarMembro
            nome={membro.nome}
            fotoUrl={membro.fotoUrl}
            tamanho="sm"
          />
          <span className="sr-only">Abrir menu da conta</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{membro.nome}</p>
          <p className="text-muted-foreground truncate text-xs">
            {membro.email}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {CARGO_LABEL[membro.cargo]}
            {funcoes ? ` · ${funcoes}` : ""}
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/equipe/perfil">
            <UserRound aria-hidden="true" />
            Meu perfil
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
          Tema
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun aria-hidden="true" />
            Claro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon aria-hidden="true" />
            Escuro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor aria-hidden="true" />
            Do sistema
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <form action={sair}>
          <button
            type="submit"
            className="hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sair
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
