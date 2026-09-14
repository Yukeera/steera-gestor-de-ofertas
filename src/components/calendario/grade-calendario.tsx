"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { AlertTriangle, CalendarClock, ImageOff, MoreVertical } from "lucide-react";
import { toast } from "sonner";

import { remanejarOferta } from "@/actions/calendario";
import { AvatarMembro } from "@/components/equipe/avatar-membro";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OFERTA_STATUS_VISUAL } from "@/lib/dominio/tipos";
import { formatarData } from "@/lib/data";
import { NOMES_DOS_DIAS, type DiaDoCalendario } from "@/lib/calendario";
import { cn } from "@/lib/utils";

import { PopupOferta, type EtapaResumida } from "./popup-oferta";
import type { OfertaNoCalendario, TarefaNoCalendario } from "./tipos";

const PREFIXO_DIA = "dia:";

type Conflito = {
  oferta: OfertaNoCalendario;
  destino: string;
  ocupante: OfertaNoCalendario;
};

/* ─────────────────────────────────────────────────────────────────────────── */

function CardOferta({
  oferta,
  podeMover,
  diasUteis,
  aoAbrir,
  aoMover,
}: {
  oferta: OfertaNoCalendario;
  podeMover: boolean;
  diasUteis: string[];
  aoAbrir: () => void;
  aoMover: (destino: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: oferta.id,
    disabled: !podeMover,
    data: { oferta },
  });

  const visual = OFERTA_STATUS_VISUAL[oferta.status];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-card group relative rounded-md border p-1.5 text-left",
        isDragging && "opacity-40",
      )}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: oferta.atrasada
          ? "var(--status-atrasada)"
          : visual.token,
      }}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          onClick={aoAbrir}
          {...(podeMover ? { ...attributes, ...listeners } : {})}
          className={cn(
            "focus-visible:ring-ring min-w-0 flex-1 rounded text-left focus-visible:ring-2 focus-visible:outline-none",
            podeMover && "cursor-grab active:cursor-grabbing",
          )}
        >
          <span className="flex items-center gap-1.5">
            <span className="bg-muted relative size-6 shrink-0 overflow-hidden rounded">
              {oferta.capaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL assinada e efêmera do Storage privado
                <img
                  src={oferta.capaUrl}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <ImageOff
                  className="text-muted-foreground absolute inset-0 m-auto size-3"
                  aria-hidden="true"
                />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium">
              {oferta.nome}
            </span>
          </span>

          <span className="mt-1 flex items-center gap-1.5">
            {oferta.atrasada ? (
              <AlertTriangle
                className="size-3 shrink-0 text-[color:var(--status-atrasada)]"
                aria-hidden="true"
              />
            ) : null}
            <span className="text-muted-foreground font-mono text-[10px] tabular">
              {oferta.etapasConcluidas}/{oferta.totalEtapas}
            </span>
            <span className="flex -space-x-1.5">
              {oferta.responsaveis.slice(0, 3).map((r) => (
                <AvatarMembro
                  key={r.id}
                  nome={r.nome}
                  fotoUrl={r.fotoUrl}
                  tamanho="xs"
                  className="ring-card size-4 text-[8px] ring-1"
                />
              ))}
            </span>
          </span>

          <span className="sr-only">
            {oferta.nome}. {visual.label}.{" "}
            {oferta.etapasConcluidas} de {oferta.totalEtapas} etapas.
            {oferta.atrasada ? " Atrasada." : ""} Abrir detalhe.
          </span>
        </button>

        {podeMover ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-5 shrink-0 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
              >
                <MoreVertical className="size-3" aria-hidden="true" />
                <span className="sr-only">Mover {oferta.nome}</span>
              </Button>
            </DropdownMenuTrigger>
            {/* WCAG 2.2 AA, critério 2.5.7: o mesmo remanejamento por clique e
                por teclado, sem depender de arrastar. */}
            <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
              <DropdownMenuLabel className="flex items-center gap-2">
                <CalendarClock className="size-3.5" aria-hidden="true" />
                Mover para
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {diasUteis.map((dia) => (
                <DropdownMenuItem
                  key={dia}
                  disabled={dia === oferta.dataPrevista}
                  onSelect={() => aoMover(dia)}
                  className="tabular"
                >
                  {formatarData(dia)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

function Celula({
  dia,
  ofertas,
  tarefas,
  podeMover,
  diasUteis,
  compacto,
  aoAbrir,
  aoMover,
}: {
  dia: DiaDoCalendario;
  ofertas: OfertaNoCalendario[];
  tarefas: TarefaNoCalendario[];
  podeMover: boolean;
  diasUteis: string[];
  compacto: boolean;
  aoAbrir: (oferta: OfertaNoCalendario) => void;
  aoMover: (oferta: OfertaNoCalendario, destino: string) => void;
}) {
  const indisponivel = dia.ehFimDeSemana || dia.ehFeriado;

  const { setNodeRef, isOver } = useDroppable({
    id: `${PREFIXO_DIA}${dia.iso}`,
    // Dia não útil não é alvo: soltar ali seria agendar trabalho para um dia
    // em que ninguém trabalha.
    disabled: !podeMover || indisponivel,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        // Altura mínima fixa reserva o espaço antes dos dados chegarem,
        // evitando salto de layout na grade inteira.
        "flex flex-col gap-1 border-t border-l p-1",
        compacto ? "min-h-28" : "min-h-36",
        indisponivel && "bg-muted/40",
        !dia.noPeriodo && "opacity-40",
        isOver && "bg-marca/10 ring-marca ring-2 ring-inset",
      )}
    >
      <div className="flex items-center justify-between px-1">
        <span
          className={cn(
            "font-mono text-xs tabular",
            dia.ehHoje
              ? "bg-marca text-marca-foreground flex size-5 items-center justify-center rounded-full font-semibold"
              : "text-muted-foreground",
          )}
        >
          {dia.numero}
        </span>
        {dia.ehFeriado ? (
          <span className="text-muted-foreground text-[10px]">feriado</span>
        ) : null}
      </div>

      {ofertas.map((oferta) => (
        <CardOferta
          key={oferta.id}
          oferta={oferta}
          podeMover={podeMover}
          diasUteis={diasUteis}
          aoAbrir={() => aoAbrir(oferta)}
          aoMover={(destino) => aoMover(oferta, destino)}
        />
      ))}

      {tarefas.map((tarefa) => (
        <div
          key={tarefa.id}
          className="bg-muted/60 flex items-center gap-1.5 rounded-md border border-dashed px-1.5 py-1"
          title={tarefa.titulo}
        >
          <span className="text-muted-foreground truncate text-[10px]">
            {tarefa.titulo}
          </span>
          <span className="flex shrink-0 -space-x-1.5">
            {tarefa.responsaveis.slice(0, 2).map((r) => (
              <AvatarMembro
                key={r.id}
                nome={r.nome}
                fotoUrl={r.fotoUrl}
                tamanho="xs"
                className="ring-card size-4 text-[8px] ring-1"
              />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

export function GradeCalendario({
  dias,
  ofertas,
  tarefas,
  etapasPorOferta,
  podeMover,
  compacto,
}: {
  dias: DiaDoCalendario[];
  ofertas: OfertaNoCalendario[];
  tarefas: TarefaNoCalendario[];
  etapasPorOferta: Record<string, EtapaResumida[]>;
  podeMover: boolean;
  compacto: boolean;
}) {
  const router = useRouter();
  const [arrastando, setArrastando] = useState<OfertaNoCalendario | null>(null);
  const [aberta, setAberta] = useState<OfertaNoCalendario | null>(null);
  const [conflito, setConflito] = useState<Conflito | null>(null);
  const [anuncio, setAnuncio] = useState("");

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const diasUteis = useMemo(
    () => dias.filter((d) => !d.ehFimDeSemana && !d.ehFeriado).map((d) => d.iso),
    [dias],
  );

  const porDia = useMemo(() => {
    const mapa = new Map<
      string,
      { ofertas: OfertaNoCalendario[]; tarefas: TarefaNoCalendario[] }
    >();

    for (const dia of dias) mapa.set(dia.iso, { ofertas: [], tarefas: [] });
    for (const o of ofertas) mapa.get(o.dataPrevista)?.ofertas.push(o);
    for (const t of tarefas) mapa.get(t.prazo)?.tarefas.push(t);

    return mapa;
  }, [dias, ofertas, tarefas]);

  function mover(oferta: OfertaNoCalendario, destino: string, trocar = false) {
    setAnuncio(`${oferta.nome} movida para ${formatarData(destino)}.`);

    void remanejarOferta(oferta.id, destino, trocar).then((resultado) => {
      if (resultado.ok) {
        toast.success(`"${oferta.nome}" agora é ${formatarData(destino)}.`);
        router.refresh();
      } else {
        toast.error(resultado.erro, { duration: 8000 });
      }
    });
  }

  /** Detecta o conflito aqui, porque a grade já sabe o que há em cada dia. */
  function tentarMover(oferta: OfertaNoCalendario, destino: string) {
    if (destino === oferta.dataPrevista) return;

    const ocupante = porDia
      .get(destino)
      ?.ofertas.find((o) => o.id !== oferta.id && o.status === "NA_ESTEIRA");

    if (ocupante) {
      setConflito({ oferta, destino, ocupante });
      return;
    }

    mover(oferta, destino);
  }

  function aoIniciarArraste(evento: DragStartEvent) {
    setArrastando(
      (evento.active.data.current?.oferta as OfertaNoCalendario) ?? null,
    );
  }

  function aoTerminarArraste(evento: DragEndEvent) {
    setArrastando(null);

    const { active, over } = evento;
    if (!over) return;

    const oferta = active.data.current?.oferta as OfertaNoCalendario | undefined;
    if (!oferta) return;

    tentarMover(oferta, String(over.id).replace(PREFIXO_DIA, ""));
  }

  return (
    <DndContext
      id="grade-calendario"
      sensors={sensores}
      collisionDetection={pointerWithin}
      onDragStart={aoIniciarArraste}
      onDragEnd={aoTerminarArraste}
      onDragCancel={() => setArrastando(null)}
    >
      <div className="overflow-x-auto">
        <div className="min-w-3xl">
          <div className="grid grid-cols-7">
            {NOMES_DOS_DIAS.map((nome) => (
              <div
                key={nome}
                className="text-muted-foreground border-l px-2 py-1.5 text-center text-xs font-medium first:border-l-0"
              >
                {nome}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 border-b border-r [&>*:nth-child(7n+1)]:border-l-0">
            {dias.map((dia) => {
              const conteudo = porDia.get(dia.iso);
              return (
                <Celula
                  key={dia.iso}
                  dia={dia}
                  ofertas={conteudo?.ofertas ?? []}
                  tarefas={conteudo?.tarefas ?? []}
                  podeMover={podeMover}
                  diasUteis={diasUteis}
                  compacto={compacto}
                  aoAbrir={setAberta}
                  aoMover={tentarMover}
                />
              );
            })}
          </div>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>

      <DragOverlay>
        {arrastando ? (
          <div className="bg-card ring-marca rounded-md border px-2 py-1 text-xs font-medium shadow-lg ring-2">
            {arrastando.nome}
          </div>
        ) : null}
      </DragOverlay>

      <PopupOferta
        oferta={aberta}
        etapas={aberta ? (etapasPorOferta[aberta.id] ?? []) : []}
        aberto={Boolean(aberta)}
        aoAlternar={(v) => !v && setAberta(null)}
      />

      <AlertDialog
        open={Boolean(conflito)}
        onOpenChange={(v) => !v && setConflito(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trocar as duas de lugar?</AlertDialogTitle>
            <AlertDialogDescription>
              {conflito ? (
                <>
                  O dia {formatarData(conflito.destino)} já tem{" "}
                  <strong>{conflito.ocupante.nome}</strong>. Confirmando,{" "}
                  <strong>{conflito.oferta.nome}</strong> vai para lá e{" "}
                  <strong>{conflito.ocupante.nome}</strong> assume{" "}
                  {formatarData(conflito.oferta.dataPrevista)} — a equipe
                  continua com uma oferta por dia.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (conflito) mover(conflito.oferta, conflito.destino, true);
                setConflito(null);
              }}
            >
              Trocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  );
}
