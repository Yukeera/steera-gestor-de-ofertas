import type { Metadata } from "next";

import { exigirMembro } from "@/lib/auth/sessao";
import { assinarCaminho, BUCKET_AVATARES } from "@/lib/storage";
import { CampoFoto } from "@/components/equipe/campo-foto";
import { FormularioNome } from "@/components/equipe/formulario-nome";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CARGO_LABEL, FUNCAO_LABEL } from "@/lib/dominio/tipos";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function PaginaPerfil() {
  const eu = await exigirMembro();
  const fotoUrl = await assinarCaminho(BUCKET_AVATARES, eu.fotoPath);

  return (
    <div className="max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl">Meu perfil</h1>
        <p className="text-muted-foreground text-sm">
          Sua foto é a miniatura que aparece ao lado de cada etapa que é sua.
        </p>
      </header>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <CampoFoto membroId={eu.id} nome={eu.nome} fotoUrl={fotoUrl} />

          <Separator />

          <FormularioNome nomeAtual={eu.nome} />

          <Separator />

          {/* RF-01.5: cargo e funções são do Chefe, então aparecem como
              leitura — mas aparecem, para a pessoa saber o que pode fazer. */}
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">E-mail</p>
              <p className="text-muted-foreground text-sm">{eu.email}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Cargo e funções</p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={eu.cargo === "CHEFE" ? "default" : "secondary"}>
                  {CARGO_LABEL[eu.cargo]}
                </Badge>
                {eu.funcoes.map((funcao) => (
                  <Badge key={funcao} variant="outline">
                    {FUNCAO_LABEL[funcao]}
                  </Badge>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                Só o Chefe altera cargo e funções.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
