"use client";

import { useId, useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { salvarEtapas } from "@/actions/roteiros";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FUNCOES, FUNCAO_LABEL, type Funcao } from "@/lib/dominio/tipos";
import { cn } from "@/lib/utils";

export type EtapaEditavel = {
  /** Chave só de interface. O banco reatribui ids a cada salvamento. */
  chave: string;
  titulo: string;
  descricao: string;
  funcoes: Funcao[];
};

function LinhaEtapa({
  etapa,
  indice,
  total,
  aoMudar,
  aoRemover,
  aoMover,
}: {
  etapa: EtapaEditavel;
  indice: number;
  total: number;
  aoMudar: (mudanca: Partial<EtapaEditavel>) => void;
  aoRemover: () => void;
  aoMover: (direcao: -1 | 1) => void;
}) {
  const idTitulo = useId();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: etapa.chave });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "bg-card flex gap-3 rounded-lg border p-3",
        isDragging && "ring-marca relative z-10 opacity-90 shadow-lg ring-2",
      )}
    >
      <div className="flex flex-col items-center gap-1 pt-1">
        <span className="text-muted-foreground font-mono text-xs tabular">
          {indice + 1}
        </span>

        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring cursor-grab rounded p-1 focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden="true" />
          <span className="sr-only">
            Arrastar a etapa {indice + 1} para reordenar
          </span>
        </button>

        {/* WCAG 2.2 AA, critério 2.5.7: arrastar nunca pode ser o único
            caminho. Estes dois botões fazem a mesma coisa, por clique e por
            teclado. */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          disabled={indice === 0}
          onClick={() => aoMover(-1)}
        >
          <ChevronUp className="size-3.5" aria-hidden="true" />
          <span className="sr-only">Subir a etapa {indice + 1}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          disabled={indice === total - 1}
          onClick={() => aoMover(1)}
        >
          <ChevronDown className="size-3.5" aria-hidden="true" />
          <span className="sr-only">Descer a etapa {indice + 1}</span>
        </Button>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex gap-2">
          <Input
            id={idTitulo}
            value={etapa.titulo}
            onChange={(e) => aoMudar({ titulo: e.target.value })}
            placeholder="O que precisa ser feito"
            aria-label={`Título da etapa ${indice + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive shrink-0"
            disabled={total === 1}
            onClick={aoRemover}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            <span className="sr-only">Remover a etapa {indice + 1}</span>
          </Button>
        </div>

        <Textarea
          value={etapa.descricao}
          onChange={(e) => aoMudar({ descricao: e.target.value })}
          rows={2}
          placeholder="Instrução para quem vai executar (opcional)"
          aria-label={`Instrução da etapa ${indice + 1}`}
          className="text-sm"
        />

        <fieldset>
          <legend className="text-muted-foreground mb-1.5 text-xs">
            Funções sugeridas — quem costuma fazer esta etapa
          </legend>
          <div className="flex flex-wrap gap-3">
            {FUNCOES.map((funcao) => (
              <label
                key={funcao}
                className="flex cursor-pointer items-center gap-1.5 text-sm"
              >
                <Checkbox
                  checked={etapa.funcoes.includes(funcao)}
                  onCheckedChange={(marcada) =>
                    aoMudar({
                      funcoes:
                        marcada === true
                          ? [...etapa.funcoes, funcao]
                          : etapa.funcoes.filter((f) => f !== funcao),
                    })
                  }
                />
                {FUNCAO_LABEL[funcao]}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </li>
  );
}

export function EditorEtapas({
  roteiroId,
  etapasIniciais,
}: {
  roteiroId: string;
  etapasIniciais: EtapaEditavel[];
}) {
  const [etapas, setEtapas] = useState(etapasIniciais);
  const [salvando, iniciar] = useTransition();

  // Comparar contra o estado inicial evita oferecer "salvar" quando nada mudou.
  const sujo = JSON.stringify(etapas) !== JSON.stringify(etapasIniciais);

  const sensores = useSensors(
    // 8px de folga antes de considerar arrasto: sem isso, um clique no campo
    // de texto vira arrasto acidental.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function mover(de: number, para: number) {
    if (para < 0 || para >= etapas.length) return;
    setEtapas((atuais) => arrayMove(atuais, de, para));
  }

  function aoTerminarArraste(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;

    const de = etapas.findIndex((e) => e.chave === active.id);
    const para = etapas.findIndex((e) => e.chave === over.id);
    mover(de, para);
  }

  function salvar() {
    iniciar(async () => {
      const resultado = await salvarEtapas(
        roteiroId,
        etapas.map((e) => ({
          titulo: e.titulo,
          descricao: e.descricao,
          funcoes: e.funcoes,
        })),
      );

      if (resultado.ok) toast.success("Roteiro salvo.");
      else toast.error(resultado.erro, { duration: 8000 });
    });
  }

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensores}
        collisionDetection={closestCenter}
        onDragEnd={aoTerminarArraste}
      >
        <SortableContext
          items={etapas.map((e) => e.chave)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-3">
            {etapas.map((etapa, indice) => (
              <LinhaEtapa
                key={etapa.chave}
                etapa={etapa}
                indice={indice}
                total={etapas.length}
                aoMudar={(mudanca) =>
                  setEtapas((atuais) =>
                    atuais.map((e, i) =>
                      i === indice ? { ...e, ...mudanca } : e,
                    ),
                  )
                }
                aoRemover={() =>
                  setEtapas((atuais) => atuais.filter((_, i) => i !== indice))
                }
                aoMover={(direcao) => mover(indice, indice + direcao)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setEtapas((atuais) => [
              ...atuais,
              {
                chave: crypto.randomUUID(),
                titulo: "",
                descricao: "",
                funcoes: [],
              },
            ])
          }
        >
          <Plus aria-hidden="true" />
          Adicionar etapa
        </Button>

        <Button type="button" onClick={salvar} disabled={!sujo || salvando}>
          {salvando ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Salvando…
            </>
          ) : (
            "Salvar roteiro"
          )}
        </Button>

        {sujo ? (
          <span className="text-muted-foreground text-sm">
            Há mudanças não salvas.
          </span>
        ) : null}
      </div>
    </div>
  );
}
