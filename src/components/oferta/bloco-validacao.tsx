"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Loader2, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { desfazerValidacao, validarOferta } from "@/actions/ofertas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatarData, hojeISO } from "@/lib/data";
import type { OfertaStatus } from "@/lib/dominio/tipos";

export function BlocoValidacao({
  ofertaId,
  status,
  dataValidacao,
  observacao,
  podeValidar,
}: {
  ofertaId: string;
  status: OfertaStatus;
  dataValidacao: string | null;
  observacao: string | null;
  podeValidar: boolean;
}) {
  const [data, setData] = useState(dataValidacao ?? hojeISO());
  const [nota, setNota] = useState(observacao ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const julgada = status === "VALIDADA" || status === "INVALIDADA";

  function julgar(validada: boolean) {
    setErro(null);
    iniciar(async () => {
      const r = await validarOferta(ofertaId, {
        validada,
        data,
        observacao: nota,
      });
      if (r.ok) {
        toast.success(validada ? "Oferta validada." : "Oferta invalidada.");
      } else {
        setErro(r.erro);
      }
    });
  }

  function desfazer() {
    setErro(null);
    iniciar(async () => {
      const r = await desfazerValidacao(ofertaId);
      if (r.ok) toast.success("Validação desfeita. A oferta voltou a Concluída.");
      else setErro(r.erro);
    });
  }

  if (status === "NA_PENEIRA" || status === "NA_ESTEIRA") {
    return (
      <Card>
        <CardContent>
          <p className="text-muted-foreground text-sm leading-relaxed">
            A oferta ainda está sendo montada. A validação fica disponível quando
            todas as etapas do roteiro estiverem concluídas.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (julgada) {
    return (
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            {status === "VALIDADA" ? (
              <BadgeCheck
                className="mt-0.5 size-5 shrink-0 text-[color:var(--status-validada)]"
                aria-hidden="true"
              />
            ) : (
              <XCircle
                className="mt-0.5 size-5 shrink-0 text-[color:var(--status-invalidada)]"
                aria-hidden="true"
              />
            )}
            <div className="space-y-1">
              <p className="font-medium">
                {status === "VALIDADA"
                  ? "Validada no teste de mercado"
                  : "Invalidada no teste de mercado"}
              </p>
              <p className="text-muted-foreground text-sm tabular">
                {dataValidacao ? formatarData(dataValidacao) : "—"}
              </p>
            </div>
          </div>

          {observacao ? (
            <p className="text-muted-foreground border-l-2 pl-3 text-sm leading-relaxed">
              {observacao}
            </p>
          ) : null}

          {erro ? (
            <p role="alert" className="text-destructive text-sm">
              {erro}
            </p>
          ) : null}

          {podeValidar ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={desfazer}
              disabled={salvando}
            >
              <RotateCcw aria-hidden="true" />
              Desfazer julgamento
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  // CONCLUIDA, aguardando julgamento.
  if (!podeValidar) {
    return (
      <Card>
        <CardContent>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Montada e em teste de mercado. O Chefe ou o Mestre da Esteira
            registra o resultado quando o teste terminar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="max-w-lg space-y-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          A oferta está montada e em teste. Registre o resultado quando tiver a
          resposta do mercado.
        </p>

        <div className="space-y-2">
          <Label htmlFor="data-validacao">Data do resultado</Label>
          <Input
            id="data-validacao"
            type="date"
            value={data}
            max={hojeISO()}
            onChange={(e) => setData(e.target.value)}
            aria-describedby="ajuda-data-validacao"
          />
          <p id="ajuda-data-validacao" className="text-muted-foreground text-xs">
            Pode ser retroativa — o que importa é quando o teste respondeu, não
            quando você registrou.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="observacao-validacao">O que aconteceu</Label>
          <Textarea
            id="observacao-validacao"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
            placeholder="Números, ângulo que funcionou, por que não foi (opcional)."
          />
        </div>

        {erro ? (
          <p role="alert" className="text-destructive text-sm">
            {erro}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => julgar(true)} disabled={salvando}>
            {salvando ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <BadgeCheck aria-hidden="true" />
            )}
            Validar
          </Button>
          <Button
            variant="secondary"
            onClick={() => julgar(false)}
            disabled={salvando}
          >
            <XCircle aria-hidden="true" />
            Invalidar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
