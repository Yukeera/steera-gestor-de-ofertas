"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PontoSemanal } from "@/lib/painel";

/**
 * Ofertas concluídas por semana.
 *
 * Série única: não há legenda, porque o título já diz o que a linha é — caixa
 * de legenda para uma coisa só é ruído.
 *
 * Abaixo de quatro pontos o gráfico não vira: dois pontos ligados por uma reta
 * sugerem uma tendência que os dados não sustentam. Nesse caso a interface
 * mostra os números direto (ver o componente pai).
 */
export function GraficoConcluidas({ pontos }: { pontos: PontoSemanal[] }) {
  const [verTabela, setVerTabela] = useState(false);

  const total = pontos.reduce((soma, p) => soma + p.quantidade, 0);
  const maximo = Math.max(...pontos.map((p) => p.quantidade), 1);

  const resumo = `Ofertas concluídas por semana. ${total} no período, de ${pontos[0]?.rotulo} a ${pontos[pontos.length - 1]?.rotulo}. Pico de ${maximo} numa semana.`;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Concluídas por semana</h3>
          <p className="text-muted-foreground text-xs tabular">
            {total} no período
          </p>
        </div>
        {/* `data-table`: gráfico sozinho não é acessível a leitor de tela. */}
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={verTabela}
          onClick={() => setVerTabela((v) => !v)}
        >
          {verTabela ? "Ver gráfico" : "Ver tabela"}
        </Button>
      </div>

      {verTabela ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Semana de</TableHead>
              <TableHead className="text-right">Concluídas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pontos.map((p) => (
              <TableRow key={p.semana}>
                <TableCell className="tabular">{p.rotulo}</TableCell>
                <TableCell className="text-right tabular">
                  {p.quantidade}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <figure className="space-y-1" role="img" aria-label={resumo}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={pontos}
              margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
            >
              {/* Grade recessiva e sem tracejado: tracejado vira ruído. */}
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <XAxis
                dataKey="rotulo"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={40}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--popover-foreground)",
                }}
                labelFormatter={(v) => `Semana de ${v}`}
                formatter={(valor) => {
                  const numero = Number(valor ?? 0);
                  return [
                    `${numero} oferta${numero === 1 ? "" : "s"}`,
                    "Concluídas",
                  ];
                }}
              />
              <Line
                type="monotone"
                dataKey="quantidade"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--chart-1)", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                // Movimento respeita quem pediu para reduzi-lo.
                isAnimationActive={
                  typeof window !== "undefined" &&
                  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
                }
              />
            </LineChart>
          </ResponsiveContainer>
        </figure>
      )}
    </div>
  );
}
