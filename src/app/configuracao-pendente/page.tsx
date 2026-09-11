import type { Metadata } from "next";
import { Settings2 } from "lucide-react";

import { MarcaSteera } from "@/components/marca";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Configuração pendente",
};

/**
 * Tela mostrada quando o `.env.local` ainda não tem as chaves do Supabase.
 * Existe para transformar um stack trace de validação numa instrução.
 */
export default function PaginaConfiguracaoPendente() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        <MarcaSteera className="justify-center" />

        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="flex items-start gap-3">
              <Settings2
                className="text-marca mt-0.5 size-5 shrink-0"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <h1 className="text-lg">Falta conectar o Supabase</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  O Steera precisa das chaves do projeto para falar com o banco.
                  Elas ficam em <code className="font-mono">.env.local</code>, na
                  raiz do projeto.
                </p>
              </div>
            </div>

            <ol className="space-y-3 text-sm leading-relaxed">
              <li className="flex gap-3">
                <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs">
                  1
                </span>
                <span>
                  Crie um projeto em{" "}
                  <span className="font-mono">supabase.com/dashboard</span>,
                  região São Paulo.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs">
                  2
                </span>
                <span>
                  Em <strong>Project Settings → API</strong>, copie a Project URL
                  e as chaves <span className="font-mono">anon</span> e{" "}
                  <span className="font-mono">service_role</span>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs">
                  3
                </span>
                <span>
                  Cole no <code className="font-mono">.env.local</code> e reinicie
                  o <code className="font-mono">npm run dev</code>.
                </span>
              </li>
            </ol>

            <p className="text-muted-foreground border-t pt-4 text-xs leading-relaxed">
              O passo a passo completo — migrations, buckets e criação do
              primeiro Chefe — está em{" "}
              <code className="font-mono">docs/SETUP.md</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
