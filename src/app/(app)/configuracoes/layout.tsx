import Link from "next/link";
import { redirect } from "next/navigation";

import { ehMestreOuChefe, exigirMembro } from "@/lib/auth/sessao";
import { AbasDeConfiguracao } from "@/components/configuracao/abas";

export default async function LayoutConfiguracoes({
  children,
}: LayoutProps<"/configuracoes">) {
  const membro = await exigirMembro();

  // O menu esconde o item, mas a URL é alcançável direto.
  if (!ehMestreOuChefe(membro)) redirect("/");

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl">Configurações</h1>
        <p className="text-muted-foreground text-sm">
          O que define como a esteira se comporta.{" "}
          <Link href="/painel" className="underline underline-offset-4">
            Ver o efeito no Painel
          </Link>
          .
        </p>
      </header>

      <AbasDeConfiguracao ehChefe={membro.cargo === "CHEFE"} />

      {children}
    </div>
  );
}
