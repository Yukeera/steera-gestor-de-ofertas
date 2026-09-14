import {
  BarChart3,
  CalendarDays,
  Filter,
  Home,
  Layers,
  ListChecks,
  Package,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type ItemNavegacao = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** Quando true, só Chefe e Mestre da Esteira veem o item. */
  restrito?: boolean;
};

/**
 * Navegação principal, na ordem do fluxo de trabalho: o que fazer hoje, onde
 * isso cai no calendário, de onde as ideias vêm, como viram rodada, e o que
 * saiu no fim.
 */
export const ITENS_NAVEGACAO: ItemNavegacao[] = [
  { href: "/", rotulo: "Hoje", icone: Home },
  { href: "/calendario", rotulo: "Calendário", icone: CalendarDays },
  { href: "/peneira", rotulo: "Peneira de Ideias", icone: Filter },
  { href: "/rodadas", rotulo: "Rodadas", icone: Layers },
  { href: "/ofertas", rotulo: "Ofertas", icone: Package },
  { href: "/tarefas", rotulo: "Tarefas", icone: ListChecks },
  { href: "/painel", rotulo: "Painel", icone: BarChart3 },
  { href: "/equipe", rotulo: "Equipe", icone: Users },
  {
    href: "/configuracoes",
    rotulo: "Configurações",
    icone: Settings,
    restrito: true,
  },
];

export function itemEstaAtivo(href: string, caminho: string): boolean {
  if (href === "/") return caminho === "/";
  return caminho === href || caminho.startsWith(`${href}/`);
}
