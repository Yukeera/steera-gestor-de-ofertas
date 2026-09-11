import { Suspense } from "react";
import type { Metadata } from "next";

import { MarcaSteera } from "@/components/marca";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function PaginaLogin() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-3 text-center">
          <MarcaSteera className="justify-center" />
          <p className="text-muted-foreground text-sm">
            A esteira de ofertas da equipe.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {/* useSearchParams exige fronteira de Suspense na renderização estática. */}
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <FormularioLogin />
            </Suspense>
          </CardContent>
        </Card>

        <p className="text-muted-foreground text-center text-xs leading-relaxed">
          O acesso é criado pelo Chefe da equipe. Se você ainda não tem conta,
          peça um convite.
        </p>
      </div>
    </main>
  );
}
