import Link from "next/link";
import { CalendarDays, Filter, PackageOpen } from "lucide-react";

import { exigirMembro, ehMestreOuChefe } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarDataPorExtenso, hojeISO } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Tela principal — "Hoje".
 *
 * Fase 0 entrega o esqueleto e os estados vazios corretos. A checklist com
 * delegação por arrastar e o bloco Minhas Tarefas chegam nas fases 5 e 6
 * (docs/PLANEJAMENTO.md §12).
 */
export default async function PaginaHoje() {
  const membro = await exigirMembro();
  const supabase = await criarClienteServidor();
  const hoje = hojeISO();

  const { data: ofertaDeHoje } = await supabase
    .from("ofertas")
    .select("id, nome, descricao, capa_url, anunciante_referencia, rodadas(nome)")
    .eq("data_prevista", hoje)
    .in("status", ["NA_ESTEIRA", "CONCLUIDA"])
    .maybeSingle();

  // RF-06.6: sem oferta hoje, mostrar a próxima agendada em vez de um vazio seco.
  const { data: proximaOferta } = ofertaDeHoje
    ? { data: null }
    : await supabase
        .from("ofertas")
        .select("id, nome, data_prevista")
        .gt("data_prevista", hoje)
        .eq("status", "NA_ESTEIRA")
        .order("data_prevista", { ascending: true })
        .limit(1)
        .maybeSingle();

  const primeiroNome = membro.nome.split(" ")[0];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-muted-foreground text-sm">
          {formatarDataPorExtenso(hoje)}
        </p>
        <h1 className="text-2xl">Oi, {primeiroNome}</h1>
      </header>

      <section aria-labelledby="titulo-oferta-hoje" className="space-y-3">
        <h2
          id="titulo-oferta-hoje"
          className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
        >
          Oferta de hoje
        </h2>

        {ofertaDeHoje ? (
          <Card>
            <CardContent className="space-y-2 pt-6">
              <h3 className="text-lg">{ofertaDeHoje.nome}</h3>
              <p className="text-muted-foreground text-sm">
                {ofertaDeHoje.descricao}
              </p>
              <Button asChild variant="secondary" size="sm">
                <Link href={`/ofertas/${ofertaDeHoje.id}`}>Abrir montagem</Link>
              </Button>
            </CardContent>
          </Card>
        ) : proximaOferta ? (
          <EstadoVazio
            icone={CalendarDays}
            titulo="Nada na esteira hoje"
            descricao={`A próxima é "${proximaOferta.nome}", em ${formatarDataPorExtenso(proximaOferta.data_prevista!)}.`}
            acao={{ href: "/calendario", rotulo: "Ver o calendário" }}
          />
        ) : (
          <EstadoVazio
            icone={PackageOpen}
            titulo="A esteira ainda não começou a girar"
            descricao={
              ehMestreOuChefe(membro)
                ? "Cadastre ideias na Peneira e monte a primeira Rodada para distribuir as ofertas pelos dias úteis."
                : "Assim que o Mestre da Esteira montar uma Rodada, a oferta do dia aparece aqui."
            }
            acao={
              ehMestreOuChefe(membro)
                ? { href: "/peneira", rotulo: "Ir para a Peneira" }
                : undefined
            }
          />
        )}
      </section>

      <section aria-labelledby="titulo-minhas-tarefas" className="space-y-3">
        <h2
          id="titulo-minhas-tarefas"
          className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
        >
          Minhas tarefas
        </h2>
        <EstadoVazio
          icone={Filter}
          titulo="Nada aberto no seu nome"
          descricao="As etapas de oferta em que você é responsável e as tarefas designadas a você aparecem aqui, juntas e ordenadas por data."
        />
      </section>
    </div>
  );
}

function EstadoVazio({
  icone: Icone,
  titulo,
  descricao,
  acao,
}: {
  icone: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  titulo: string;
  descricao: string;
  acao?: { href: string; rotulo: string };
}) {
  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <Icone className="text-muted-foreground size-8" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium">{titulo}</p>
          <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed">
            {descricao}
          </p>
        </div>
        {acao ? (
          <Button asChild variant="secondary" size="sm" className="mt-1">
            <Link href={acao.href}>{acao.rotulo}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
