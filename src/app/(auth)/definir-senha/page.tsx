import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MarcaSteera } from "@/components/marca";
import { Card, CardContent } from "@/components/ui/card";
import { criarClienteServidor } from "@/lib/supabase/server";

import { FormularioSenha } from "./formulario-senha";

export const metadata: Metadata = { title: "Definir senha" };

/**
 * Chegada do convite: /auth/confirm já trocou o token por sessão, e aqui a
 * pessoa escolhe a própria senha. É a última etapa do RF-01.1.
 */
export default async function PaginaDefinirSenha() {
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sem sessão significa link consumido, expirado ou acesso direto à URL.
  if (!user) redirect("/login?erro=link-invalido");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-3 text-center">
          <MarcaSteera className="justify-center" />
          <p className="text-muted-foreground text-sm">
            Falta só escolher uma senha.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="text-muted-foreground text-sm">
              Você entrou como <strong>{user.email}</strong>.
            </p>
            <FormularioSenha />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
