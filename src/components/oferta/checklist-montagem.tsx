"use client";

import { useMemo, useState, useTransition } from "react";
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
import { Check, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  alternarEtapa,
  definirResponsaveis,
  delegarEtapa,
} from "@/actions/etapas";
import { AvatarMembro } from "@/components/equipe/avatar-membro";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type MembroLeve = {
  id: string;
  nome: string;
  fotoUrl: string | null;
};

export type EtapaDaChecklist = {
  id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  concluida: boolean;
  responsaveis: MembroLeve[];
};

const PREFIXO_MEMBRO = "membro:";
const PREFIXO_ETAPA = "etapa:";

/* ────────────────────────────────────────────────────────────────────────────
   Barra de membros — a origem do arrasto
   ──────────────────────────────────────────────────────────────────────────── */

function MembroArrastavel({ membro }: { membro: MembroLeve }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${PREFIXO_MEMBRO}${membro.id}`,
    data: { membro },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      title={membro.nome}
      className={cn(
        "focus-visible:ring-ring cursor-grab rounded-full focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <AvatarMembro
        nome={membro.nome}
        fotoUrl={membro.fotoUrl}
        tamanho="md"
        className="ring-background ring-2"
      />
      <span className="sr-only">Arrastar {membro.nome} para uma etapa</span>
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Seletor por clique — a alternativa obrigatória ao arrastar
   ──────────────────────────────────────────────────────────────────────────── */

function SeletorResponsaveis({
  etapa,
  ofertaId,
  equipe,
  aoAtualizar,
}: {
  etapa: EtapaDaChecklist;
  ofertaId: string;
  equipe: MembroLeve[];
  aoAtualizar: (responsaveis: MembroLeve[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [salvando, iniciar] = useTransition();

  const marcados = new Set(etapa.responsaveis.map((r) => r.id));

  function alternar(membro: MembroLeve, marcar: boolean) {
    const novos = marcar
      ? [...etapa.responsaveis, membro]
      : etapa.responsaveis.filter((r) => r.id !== membro.id);

    aoAtualizar(novos);

    iniciar(async () => {
      const resultado = await definirResponsaveis(
        etapa.id,
        ofertaId,
        novos.map((n) => n.id),
      );
      if (!resultado.ok) {
        aoAtualizar(etapa.responsaveis);
        toast.error(resultado.erro);
      }
    });
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "size-8 rounded-full",
            etapa.responsaveis.length === 0 &&
              "border-muted-foreground/40 border border-dashed",
          )}
        >
          {etapa.responsaveis.length === 0 ? (
            <UserPlus className="size-3.5" aria-hidden="true" />
          ) : (
            <span className="flex -space-x-2">
              {etapa.responsaveis.slice(0, 3).map((r) => (
                <AvatarMembro
                  key={r.id}
                  nome={r.nome}
                  fotoUrl={r.fotoUrl}
                  tamanho="sm"
                  className="ring-background ring-2"
                />
              ))}
            </span>
          )}
          <span className="sr-only">
            {etapa.responsaveis.length === 0
              ? `Escolher responsável pela etapa ${etapa.titulo}`
              : `Responsáveis pela etapa ${etapa.titulo}: ${etapa.responsaveis
                  .map((r) => r.nome)
                  .join(", ")}. Alterar.`}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 p-2">
        <p className="text-muted-foreground px-2 pt-1 pb-2 text-xs">
          Quem faz esta etapa
        </p>
        <ul>
          {equipe.map((membro) => (
            <li key={membro.id}>
              <label className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                <Checkbox
                  checked={marcados.has(membro.id)}
                  disabled={salvando}
                  onCheckedChange={(m) => alternar(membro, m === true)}
                />
                <AvatarMembro
                  nome={membro.nome}
                  fotoUrl={membro.fotoUrl}
                  tamanho="xs"
                />
                <span className="min-w-0 flex-1 truncate">{membro.nome}</span>
              </label>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Linha da etapa — também o alvo de soltura
   ──────────────────────────────────────────────────────────────────────────── */

function LinhaEtapa({
  etapa,
  ofertaId,
  equipe,
  podeDelegar,
  aoAtualizarResponsaveis,
  aoAlternar,
}: {
  etapa: EtapaDaChecklist;
  ofertaId: string;
  equipe: MembroLeve[];
  podeDelegar: boolean;
  aoAtualizarResponsaveis: (responsaveis: MembroLeve[]) => void;
  aoAlternar: (concluida: boolean) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${PREFIXO_ETAPA}${etapa.id}`,
    disabled: !podeDelegar,
    data: { etapa },
  });

  return (
    <li
      ref={setNodeRef}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
        isOver && "border-marca bg-marca/5 border-dashed",
        etapa.concluida && "bg-muted/40",
      )}
    >
      <span className="text-muted-foreground w-4 pt-1.5 font-mono text-xs tabular">
        {etapa.ordem}
      </span>

      {/* Caixa de 20px com área clicável de 44px, como manda o design system. */}
      <label className="flex min-h-11 cursor-pointer items-start gap-3 pt-1">
        <Checkbox
          checked={etapa.concluida}
          onCheckedChange={(m) => aoAlternar(m === true)}
          aria-label={`Concluir a etapa ${etapa.titulo}`}
        />
        <span className="sr-only">{etapa.titulo}</span>
      </label>

      <div className="min-w-0 flex-1 pt-1">
        <p
          className={cn(
            "text-sm leading-snug",
            // Concluída carrega três sinais: check, risco e opacidade. Nunca
            // só a cor.
            etapa.concluida && "text-muted-foreground line-through opacity-70",
          )}
        >
          {etapa.titulo}
        </p>
        {etapa.descricao ? (
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            {etapa.descricao}
          </p>
        ) : null}
      </div>

      {podeDelegar ? (
        <SeletorResponsaveis
          etapa={etapa}
          ofertaId={ofertaId}
          equipe={equipe}
          aoAtualizar={aoAtualizarResponsaveis}
        />
      ) : (
        <span className="flex -space-x-2 pt-0.5">
          {etapa.responsaveis.length === 0 ? (
            <span className="text-muted-foreground text-xs">Sem responsável</span>
          ) : (
            etapa.responsaveis.map((r) => (
              <AvatarMembro
                key={r.id}
                nome={r.nome}
                fotoUrl={r.fotoUrl}
                tamanho="sm"
                className="ring-background ring-2"
              />
            ))
          )}
        </span>
      )}
    </li>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Checklist
   ──────────────────────────────────────────────────────────────────────────── */

export function ChecklistMontagem({
  ofertaId,
  etapasIniciais,
  equipe,
  podeDelegar,
}: {
  ofertaId: string;
  etapasIniciais: EtapaDaChecklist[];
  equipe: MembroLeve[];
  podeDelegar: boolean;
}) {
  const router = useRouter();
  const [etapas, setEtapas] = useState(etapasIniciais);
  const [arrastando, setArrastando] = useState<MembroLeve | null>(null);
  const [anuncio, setAnuncio] = useState("");

  const sensores = useSensors(
    // 8px de folga: sem isso um clique no avatar viraria arrasto acidental.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const concluidas = useMemo(
    () => etapas.filter((e) => e.concluida).length,
    [etapas],
  );

  function atualizarEtapa(id: string, mudanca: Partial<EtapaDaChecklist>) {
    setEtapas((atuais) =>
      atuais.map((e) => (e.id === id ? { ...e, ...mudanca } : e)),
    );
  }

  function alternar(etapa: EtapaDaChecklist, concluida: boolean) {
    // Otimista: com ~400ms de ida e volta, esperar o servidor para riscar o
    // item faria a checklist parecer travada.
    atualizarEtapa(etapa.id, { concluida });

    void alternarEtapa(etapa.id, ofertaId, concluida).then((resultado) => {
      if (resultado.ok) {
        router.refresh();
      } else {
        atualizarEtapa(etapa.id, { concluida: !concluida });
        toast.error(resultado.erro, { duration: 6000 });
      }
    });
  }

  function aoIniciarArraste(evento: DragStartEvent) {
    const membro = evento.active.data.current?.membro as MembroLeve | undefined;
    setArrastando(membro ?? null);
  }

  function aoTerminarArraste(evento: DragEndEvent) {
    setArrastando(null);

    const { active, over } = evento;
    if (!over) return;

    const membro = active.data.current?.membro as MembroLeve | undefined;
    const etapaId = String(over.id).replace(PREFIXO_ETAPA, "");
    const etapa = etapas.find((e) => e.id === etapaId);

    if (!membro || !etapa) return;
    if (etapa.responsaveis.some((r) => r.id === membro.id)) return;

    const anteriores = etapa.responsaveis;
    atualizarEtapa(etapa.id, { responsaveis: [...anteriores, membro] });

    // `aria-live`: quem usa leitor de tela precisa saber que a atribuição
    // aconteceu — o avatar aparecendo não conta.
    setAnuncio(`${membro.nome} atribuído à etapa ${etapa.titulo}.`);

    void delegarEtapa(etapa.id, ofertaId, membro.id).then((resultado) => {
      if (!resultado.ok) {
        atualizarEtapa(etapa.id, { responsaveis: anteriores });
        toast.error(resultado.erro);
      }
    });
  }

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={pointerWithin}
      onDragStart={aoIniciarArraste}
      onDragEnd={aoTerminarArraste}
      onDragCancel={() => setArrastando(null)}
    >
      <div className="space-y-4">
        {podeDelegar && equipe.length > 0 ? (
          <div className="bg-muted/50 flex flex-wrap items-center gap-3 rounded-lg border p-3">
            <span className="text-muted-foreground text-xs">
              Arraste uma pessoa até a etapa — ou clique no avatar da etapa para
              escolher pela lista.
            </span>
            <div className="flex flex-wrap gap-2">
              {equipe.map((membro) => (
                <MembroArrastavel key={membro.id} membro={membro} />
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Roteiro de Montagem
          </h2>
          <span className="text-muted-foreground font-mono text-sm tabular">
            {concluidas}/{etapas.length}
          </span>
        </div>

        <ul className="space-y-2">
          {etapas.map((etapa) => (
            <LinhaEtapa
              key={etapa.id}
              etapa={etapa}
              ofertaId={ofertaId}
              equipe={equipe}
              podeDelegar={podeDelegar}
              aoAlternar={(concluida) => alternar(etapa, concluida)}
              aoAtualizarResponsaveis={(responsaveis) =>
                atualizarEtapa(etapa.id, { responsaveis })
              }
            />
          ))}
        </ul>

        {concluidas === etapas.length && etapas.length > 0 ? (
          <p className="text-[color:var(--status-concluida)] flex items-center gap-2 text-sm font-medium">
            <Check className="size-4" aria-hidden="true" />
            Montagem concluída. A oferta entrou em teste.
          </p>
        ) : null}

        <p aria-live="polite" className="sr-only">
          {anuncio}
        </p>
      </div>

      <DragOverlay>
        {arrastando ? (
          <AvatarMembro
            nome={arrastando.nome}
            fotoUrl={arrastando.fotoUrl}
            tamanho="md"
            className="ring-marca shadow-lg ring-2"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
