import { Smartphone, type LucideIcon } from "lucide-react";

export type AppExterno = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
};

/**
 * Outras aplicações da operação.
 *
 * Não são telas do Steera, e a navegação não finge que são: ficam separadas
 * no rodapé da barra, com marca de link externo, e abrem em aba nova — quem
 * está no meio de uma montagem não deveria perder a tela ao consultar outra
 * coisa.
 */
export const APPS_EXTERNOS: AppExterno[] = [
  {
    href: "https://central-de-chips.vercel.app/",
    rotulo: "Central de Chips",
    icone: Smartphone,
  },
];
