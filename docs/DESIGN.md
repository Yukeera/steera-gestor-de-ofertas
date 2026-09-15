# Steera — Design System (MASTER)

> Fonte da verdade de UI/UX do Steera. Gerado com a skill **ui-ux-pro-max**
> (`~/.claude/skills/ui-ux-pro-max`) e ajustado ao contexto do produto.
> Ao construir qualquer tela, ler este arquivo primeiro. Se existir um override
> em `docs/design/<pagina>.md`, ele tem prioridade sobre o que está aqui.

| | |
|---|---|
| **Produto** | Steera — gestor de esteira de ofertas (uso interno) |
| **Tipo de produto** | Productivity Tool / Internal Admin Dashboard |
| **Stack** | Next.js 16 + Tailwind 4 + shadcn/ui + Recharts + dnd-kit |
| **Plataforma** | Web, desktop-first, responsivo até 375px |
| **Temas** | Claro e escuro, ambos suportados (escuro é o padrão da equipe) |

---

## 1. Direção de estilo

Consulta à base de produtos da skill (`--domain product`) classificou o Steera
como **Productivity Tool**, cuja recomendação é:

- **Estilo primário:** Flat Design + Micro-interactions
- **Estilos secundários:** Minimalism & Swiss Style, Soft UI Evolution
- **Estilo de dashboard:** Drill-Down Analytics
- **Foco de paleta:** hierarquia clara + cores funcionais

**Tradução para o Steera:** superfície plana, sem gradiente decorativo, sem
glassmorphism. A hierarquia vem de espaçamento, peso tipográfico e borda — não de
sombra pesada. O charme fica nas micro-interações: o card que se destaca ao ser
arrastado, o item do roteiro que risca ao ser concluído, o KPI que conta até o
valor. Nada de animação decorativa.

**Anti-padrões a evitar:**

- Glassmorphism e blur decorativo (mata a legibilidade em tela densa de dados)
- Emoji como ícone
- Sombras arbitrárias — só a escala de elevação definida no §5
- Cor como único portador de significado
- Modo claro como um "modo escuro invertido"

---

### 1.1 Marca

O símbolo é uma correia transportadora — dois roletes e a fita tangenciando os
dois. A forma sai da mecânica, não de ornamento: é o que amarra a marca ao
vocabulário do produto (esteira, rolete, montagem).

Construção, arte-fonte e regras de uso (tamanho mínimo, cor, o que não fazer)
estão em **[docs/marca/README.md](marca/README.md)**. O componente vive em
`src/components/marca.tsx`.

---

## 2. Paleta

Base: paleta **Inventory & Stock Management** ("industrial slate") da skill,
com o acento âmbar da paleta **Analytics Dashboard** — o âmbar carrega a
identidade de garimpo/esteira da marca.

### 2.1 Tokens semânticos

Definir como variáveis CSS no `globals.css` e mapear no `tailwind.config`.
Nunca usar hex cru dentro de componente.

| Token | Claro | Escuro |
|---|---|---|
| `--background` | `#F8FAFC` | `#020617` |
| `--foreground` | `#0F172A` | `#F8FAFC` |
| `--card` | `#FFFFFF` | `#0E1223` |
| `--card-foreground` | `#0F172A` | `#F8FAFC` |
| `--primary` | `#334155` | `#CBD5E1` |
| `--primary-foreground` | `#FFFFFF` | `#0F172A` |
| `--secondary` | `#E2E8F0` | `#1E293B` |
| `--secondary-foreground` | `#0F172A` | `#F8FAFC` |
| `--accent` (hover neutro) | `#F1F5F9` | `#1E293B` |
| `--accent-foreground` | `#0F172A` | `#F8FAFC` |
| `--muted` | `#F1F5F9` | `#1A1E2F` |
| `--muted-foreground` | `#475569` | `#94A3B8` |
| `--marca` (identidade / CTA) | `#D97706` | `#F59E0B` |
| `--marca-foreground` | `#0F172A` | `#0F172A` |
| `--border` | `#E2E8F0` | `#334155` |
| `--destructive` | `#DC2626` | `#EF4444` |
| `--destructive-foreground` | `#FFFFFF` | `#0F172A` |
| `--ring` | `#334155` | `#F8FAFC` |

> **Por que a marca não é o `--accent`:** no shadcn/ui, `--accent` é a
> superfície neutra de *hover* de menus e itens de lista. Pintá-la de âmbar
> deixaria todo dropdown laranja. Por isso a cor da marca vive num token
> próprio, `--marca`, usado em logo, indicador de navegação ativa e CTA.
>
> **Regra de contraste do âmbar:** texto sobre `--marca` é sempre escuro
> (`#0F172A`), nunca branco. Branco sobre `#D97706` dá ~3,1:1 e reprova no AA.

### 2.2 Cores de status

Cada status **sempre** aparece com ícone + rótulo. A cor é reforço, nunca o
único sinal (regra `color-not-only`, severidade alta).

| Status | Claro | Escuro | Ícone Lucide |
|---|---|---|---|
| Na Peneira | `#475569` | `#94A3B8` | `Filter` |
| Na Esteira | `#1D4ED8` | `#60A5FA` | `Cog` |
| Concluída | `#4338CA` | `#A5B4FC` | `CheckCheck` |
| Validada | `#15803D` | `#4ADE80` | `BadgeCheck` |
| Invalidada | `#B91C1C` | `#F87171` | `XCircle` |
| Descartada | `#64748B` | `#64748B` | `Archive` |
| Atrasada *(derivado)* | `#C2410C` | `#FB923C` | `AlertTriangle` |

Todos os tons claros são nível 700+, garantindo ≥4,5:1 sobre `#F8FAFC`.
Modo escuro usa variantes dessaturadas/mais claras — não o inverso do claro.

---

## 3. Tipografia

Pareamento **Dashboard Data** da skill: `Fira Code` + `Fira Sans`.
Coesão de família, com o mono carregando os dados e o sans carregando a leitura.

```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
```

```js
fontFamily: {
  sans: ['Fira Sans', 'system-ui', 'sans-serif'],
  mono: ['Fira Code', 'ui-monospace', 'monospace'],
}
```

| Uso | Fonte | Peso |
|---|---|---|
| Títulos de página e seção | Fira Code | 600 |
| Corpo, labels, descrições | Fira Sans | 400 |
| Labels de formulário e botões | Fira Sans | 500 |
| Números de KPI, datas, contadores, progresso (5/8) | Fira Code | 500 |

**Alternativa** se Fira Code pesar demais nos títulos: `IBM Plex Sans` (corpo) +
`JetBrains Mono` (dados), pareamento *Developer Mono* da mesma base.

### 3.1 Escala e ritmo

- Escala: **12 / 14 / 16 / 18 / 20 / 24 / 32 / 40**
- Corpo: 16px, `line-height: 1.5`
- Nunca abaixo de 12px, e 12px só em rótulo auxiliar — nunca em corpo
- Medida de linha: 60–75 caracteres no desktop
- Colunas numéricas e KPIs com `font-variant-numeric: tabular-nums`, para o
  número não "dançar" quando atualiza
- `font-display: swap` e preload apenas dos pesos críticos (400 e 600)
- Preferir quebra de linha a truncamento; ao truncar, `title`/tooltip com o texto
  completo

---

## 4. Layout

| Item | Valor |
|---|---|
| Breakpoints | 375 / 768 / 1024 / 1440 |
| Navegação | Sidebar fixa de 240px a partir de 1024px; barra superior + drawer abaixo disso |
| Barra superior | 56px, com busca e avatar do usuário |
| Largura de conteúdo | `max-w-7xl` centralizado |
| Gutters | 24px no desktop, 16px no mobile |
| Espaçamento | Escala de 4/8px (padrão Tailwind), sem valores fora dela |
| Ritmo vertical | Seções em 16 / 24 / 32 / 48 conforme hierarquia |
| Raio | 8px em cards e popovers, 6px em inputs e botões, `full` em avatares e chips |
| Z-index | 0 base · 10 sticky · 20 dropdown · 40 overlay · 100 modal · 1000 toast |

### 4.1 Elevação

Só três níveis, sem exceção:

| Nível | Uso | Estilo |
|---|---|---|
| 0 — plano | fundo, listas | sem sombra |
| 1 — card | cards de oferta, KPI, painéis | `border` + `shadow-sm` |
| 2 — overlay | popover, dropdown, modal, card sendo arrastado | `shadow-lg` + scrim de 50% no modal |

### 4.2 Ícones

- **Lucide** exclusivamente, 20px por padrão (16px inline, 24px em destaque)
- Stroke 1.75 uniforme; nunca misturar preenchido e contornado no mesmo nível
- Botão só de ícone exige `aria-label`
- Área de toque mínima 44×44px, mesmo com ícone de 20px

---

## 5. Movimento

| Regra | Valor |
|---|---|
| Micro-interações | 150–300ms |
| Transições complexas | ≤400ms |
| Saída | 60–70% da duração da entrada |
| Easing | `ease-out` ao entrar, `ease-in` ao sair; nunca `linear` |
| Propriedades animáveis | apenas `transform` e `opacity` |
| Entrada de listas | escalonar 30–50ms por item |
| Interrupção | toda animação é cancelável por interação do usuário |
| `prefers-reduced-motion` | respeitado — reduz a movimentação, mantém a leitura |

Toda animação precisa comunicar causa e efeito. Se ela só enfeita, sai.

---

## 6. Padrões de componente do Steera

### 6.1 Arrastar e soltar — **regra crítica**

A base da skill traz isto como severidade **alta**: *"WCAG 2.2 AA exige uma
alternativa de ponteiro único para operações de arrastar controladas pelo autor.
Não faça do arrastar a única forma de reordenar, mover ou selecionar."*

Isso vale para os três lugares onde o Steera usa arrastar:

| Onde | Ação por arrastar | Alternativa obrigatória |
|---|---|---|
| Delegação de etapa | soltar a foto do membro sobre a etapa | clicar no avatar da etapa abre um seletor de membros, operável por teclado |
| Remanejar oferta | arrastar o card para outro dia | menu do card com "Mover para…" e seletor de data |
| Ordem das ofertas na Rodada | arrastar para reordenar | botões "subir" / "descer" ao lado da alça |

Implementação com `@dnd-kit/core`:

- `PointerSensor` com `activationConstraint: { distance: 8 }` — evita arrasto acidental
- `KeyboardSensor` habilitado em todos os contextos arrastáveis
- Alvo de soltura destacado com anel tracejado de 2px em `--accent`
- Fantasma do item acompanha o cursor em tempo real (`gesture-feedback`)
- Soltura inválida (fim de semana, feriado): cursor `not-allowed` e retorno animado à origem, sem mensagem de erro modal
- Anúncio em `aria-live="polite"`: "Ana atribuída à etapa Geração do funil"
- Atualização otimista + toast com **Desfazer** (`undo-support`)

### 6.2 Checklist do Roteiro

- Caixa visualmente de 20px com área clicável de 44×44px
- Item concluído: ícone de check **+** texto riscado **+** opacidade 0,6 — três sinais, não só a cor
- Alternância otimista, com rollback e toast de erro em caso de falha
- Transição de 150ms sem deslocamento de layout
- Avatar do responsável à direita, 28px, com `title` e `aria-label` contendo o nome
- Etapa sem dono: avatar tracejado com ícone `UserPlus` e rótulo "Sem responsável"
- Etapa com mais de um responsável: avatares empilhados com sobreposição de 8px, no máximo 3 visíveis e "+N" depois disso

### 6.3 Calendário

- Altura mínima fixa por célula do mês, para não haver salto de layout ao carregar (CLS)
- Card do dia: capa 32px, nome truncado em uma linha, progresso em mono (`5/8`), avatares empilhados
- Fim de semana e feriado com fundo `--muted` e sem alvo de soltura
- Legenda de status sempre visível acima da grade
- Estado vazio do dia é silencioso; o estado vazio do mês inteiro traz texto e ação ("Nenhuma rodada agendada — criar rodada")

### 6.4 Painel

Recomendações vindas da base de charts da skill:

| Visualização | Tipo | Regras |
|---|---|---|
| Ofertas concluídas ao longo do tempo | **Line Chart** (Recharts) | precisa de ≥4 pontos; abaixo disso, usar stat card. Séries distintas por cor **e** por traço (sólido/tracejado) |
| Funil do período (cadastradas → escaladas → concluídas → validadas) | **Barras horizontais em HTML** | Quatro números ordenados não precisam de SVG, e a versão em HTML já é lida por leitor de tela sem trabalho extra. Mostrar o % de conversão entre estágios e destacar a maior queda em texto, não só em cor |
| KPIs | **Stat cards** | número em Fira Code tabular, rótulo acima, variação com ícone de seta + texto (não só cor verde/vermelha) |
| Galeria de Validadas | **Grid de cards** | `aspect-ratio` fixo para evitar CLS, `loading="lazy"`, `alt` = nome da oferta |

**Rampa do funil — categoria ordenada, não categórica.** Os quatro estágios são
marcos do *mesmo* caminho, não identidades independentes: quatro cores diferentes
sugeririam o contrário. A regra é um hue só, escurecendo (ou clareando, no tema
escuro). Os passos abaixo passaram nas quatro checagens de rampa ordinal
(monotonia de luminosidade, distância mínima entre degraus, hue único e contraste
do extremo claro contra a superfície):

| Tema | Rampa |
|---|---|
| Claro | `#60A5FA` → `#3B82F6` → `#1D4ED8` → `#172554` |
| Escuro | `#1D4ED8` → `#3B82F6` → `#60A5FA` → `#93C5FD` |

> O escuro **não** é o claro invertido: a rampa clara reprova no contraste contra
> `#0E1223`. Cada tema tem os seus passos, validados separadamente.

Válido para todo gráfico:

- Legenda visível e próxima ao gráfico, clicável para alternar séries
- Tooltip acessível por teclado, não só por hover
- **Tabela equivalente** disponível — gráfico sozinho não é acessível a leitor de tela
- Resumo em texto (`aria-label`) com a leitura principal do gráfico
- Skeleton durante o carregamento, nunca um eixo vazio
- Estado vazio com texto e orientação, nunca gráfico em branco
- Falha de carga mostra erro com ação de repetir
- Números e datas formatados em pt-BR
- Animação de entrada respeita `prefers-reduced-motion`

### 6.5 Tabelas e listas

- `Table` do shadcn com estrutura semântica completa (`TableHeader` / `TableBody` / `TableHead`)
- Filtro, ordenação e paginação via **TanStack Table** (padrão DataTable do shadcn), não implementação própria
- `aria-sort` refletindo a ordenação atual
- Virtualizar acima de 50 linhas
- Exportação CSV nas listagens de oferta

### 6.6 Formulários

- Label visível sempre — placeholder não é label
- Texto de ajuda persistente abaixo de campos complexos
- Validação no `blur`, não a cada tecla
- Erro abaixo do campo, com causa **e** como corrigir; nunca só "Campo inválido"
- Ao submeter com erro, foco automático no primeiro campo inválido
- Erros anunciados via `role="alert"`
- Campos obrigatórios marcados
- Confirmação antes de ação destrutiva, com desfazer quando possível
- Rascunho salvo automaticamente no assistente de Rodada (formulário longo)
- Assistente de Rodada mostra indicador de passo e permite voltar

---

## 7. Acessibilidade — checklist de entrega

Nenhuma tela sobe sem passar por aqui:

- [ ] Contraste ≥4,5:1 em texto normal e ≥3:1 em texto grande e ícones — verificado nos **dois** temas
- [ ] Anel de foco visível de 2px em todo controle interativo, inclusive dentro de modal
- [ ] Ordem de tabulação igual à ordem visual, sem armadilha de foco
- [ ] Toda operação de arrastar tem alternativa de clique e de teclado
- [ ] Botão só de ícone tem `aria-label`
- [ ] Imagens de capa com `alt` descritivo
- [ ] Hierarquia de headings sequencial, sem pular nível
- [ ] Link "pular para o conteúdo" no topo
- [ ] Cor nunca é o único portador de significado
- [ ] `prefers-reduced-motion` respeitado
- [ ] Toast não rouba foco; usa `aria-live="polite"`
- [ ] Testado em 375 / 768 / 1024 / 1440
- [ ] Sem rolagem horizontal em nenhuma largura

---

## 8. Performance

- Imagens em WebP/AVIF, com `width`/`height` ou `aspect-ratio` declarados
- `loading="lazy"` abaixo da dobra; capa da oferta do dia carrega com prioridade
- Skeleton para qualquer carregamento acima de 300ms
- Code splitting por rota; calendário e gráficos entram por `dynamic import`
- Espaço reservado para conteúdo assíncrono — meta de CLS < 0,1
- Virtualização em listas longas
- `debounce` em busca e filtros
