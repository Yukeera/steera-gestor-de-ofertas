# Steera — Documento de Planejamento

> Aplicação web de gestão do fluxo de trabalho de uma equipe de marketing digital,
> organizada em torno de uma **esteira de ofertas**: ideias entram cruas, são
> selecionadas, produzidas em rodadas diárias e validadas.

| | |
|---|---|
| **Produto** | Steera |
| **Versão do documento** | 2.0 |
| **Data** | 10/09/2026 |
| **Stack** | Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + Supabase |
| **Design system** | [docs/DESIGN.md](DESIGN.md) — gerado com a skill `ui-ux-pro-max` |
| **Idioma / fuso** | pt-BR / America/Sao_Paulo |
| **Escopo** | Uso interno de uma única empresa (sem multi-tenant) |

---

## 1. Visão geral

O Steera existe para responder três perguntas que hoje se perdem em conversas soltas:

1. **O que a equipe está montando hoje?**
2. **Quem é o dono de cada etapa dessa montagem?**
3. **Do que a gente já produziu, o que realmente funcionou?**

A metáfora que organiza o produto é a de uma linha de montagem. Ideias de oferta
entram por uma **Peneira**, o gestor separa um conjunto delas em uma **Rodada**, a
Rodada é distribuída no calendário em ritmo de **uma oferta por dia útil**, e cada
oferta percorre um **Roteiro de Montagem** — um checklist de etapas com dono
definido. Ao final, a oferta é **Concluída** e, depois do teste de mercado,
**Validada** ou **Invalidada**.

Ao lado da esteira existe um segundo tipo de trabalho: as **Tarefas** — trabalhos
individuais que o Chefe ou o Mestre da Esteira designam diretamente a um membro,
fora do fluxo das ofertas. Os dois tipos se encontram no mesmo lugar: o bloco
**Minhas Tarefas** da tela inicial reúne as **Etapas** de oferta em que a pessoa
é responsável e as **Tarefas** designadas a ela.

O ponto central do produto é que a oferta é uma entidade única que atravessa todo
o ciclo. As informações criadas lá na Peneira (nome, descrição, anunciante de
referência, criativo) acompanham a oferta até o Painel, sem recadastro.

---

## 2. Vocabulário do produto

| Conceito genérico | Nome no Steera |
|---|---|
| Sprint manager | **Mestre da Esteira** |
| Sprint | **Rodada** |
| Brainstorm | **Peneira de Ideias** |
| Em produção | **Na Esteira** |
| Dashboard | **Painel** |
| Oferta finalizada, aguardando teste | **Concluída** |
| Oferta aprovada no teste | **Validada** |
| Oferta reprovada no teste | **Invalidada** |
| Gestão de tráfego (função) | **Gestor de Tráfego** |
| Produção de criativos (função) | **Garimpeiro** |
| Alinhamento de fluxos do ChatBot (função) | **Engenheiro de Fluxos** |

Termos que ainda proponho (a confirmar):

| Conceito genérico | Nome proposto | Motivo |
|---|---|---|
| Template de checklist | **Roteiro de Montagem** (ou só "Roteiro") | é o passo a passo da linha de montagem |
| Item do checklist | **Etapa** | curto, cabe na UI |
| Ideia arquivada sem entrar em Rodada | **Descartada** | — |

> **Etapa × Tarefa:** *Etapa* é sempre um item do Roteiro de Montagem, presa a
> uma oferta. *Tarefa* é o trabalho individual avulso, que pode ou não estar
> vinculado a uma oferta. O bloco **Minhas Tarefas** da tela inicial mostra os
> dois juntos, com a origem identificada em cada linha.

---

## 3. Papéis: Cargo × Função

São dois eixos **independentes**. O cargo define o poder hierárquico; a função
define a especialidade técnica e é o que amarra as etapas do Roteiro.

### 3.1 Cargos

- **Chefe** — acesso total, incluindo validação de ofertas, gestão de membros e
  configuração de Roteiros.
- **Funcionário** — executa etapas e cadastra ideias.

### 3.2 Funções

- **Mestre da Esteira** — cria e edita Rodadas, distribui ofertas no calendário,
  delega responsáveis e cria Tarefas.
- **Gestor de Tráfego** — gestão de tráfego e campanhas.
- **Garimpeiro** — produção de criativos.
- **Engenheiro de Fluxos** — fluxos do ChatBot.

> **Acúmulo de funções:** um membro pode ter **mais de uma função** ao mesmo
> tempo — o Chefe pode ser também Mestre da Esteira, um Garimpeiro pode acumular
> Gestor de Tráfego. Por isso a função é uma relação N:N (tabela
> `membro_funcoes`), não um campo único no perfil. O cargo, esse sim, é único
> por pessoa.

### 3.3 Matriz de permissões

| Ação | Chefe | Mestre da Esteira | Demais funcionários |
|---|:---:|:---:|:---:|
| Ver tudo (calendário, ofertas, Painel) | ✅ | ✅ | ✅ |
| Cadastrar ideia na Peneira | ✅ | ✅ | ✅ |
| Editar/descartar ideia na Peneira | ✅ | ✅ | só as próprias |
| Criar / editar / cancelar Rodada | ✅ | ✅ | ❌ |
| Remanejar oferta no calendário | ✅ | ✅ | ❌ |
| Trocar o Roteiro de uma oferta | ✅ | ✅ | ❌ |
| Delegar responsável de etapa | ✅ | ✅ | ❌ |
| Marcar etapa como concluída | ✅ | ✅ | só as suas |
| Validar / Invalidar oferta | ✅ | ✅ | ❌ |
| Criar / editar Roteiros de Montagem | ✅ | ✅ | ❌ |
| **Criar / editar / cancelar Tarefa** | ✅ | ✅ | ❌ |
| **Concluir Tarefa** | ✅ | ✅ | só as suas |
| Cadastrar / editar / desativar membros | ✅ | ❌ | ❌ |

---

## 4. Ciclo de vida da oferta

```
                         ┌──────────────┐
   cadastro na Peneira → │  NA_PENEIRA  │ ──── descartada ───→ [ DESCARTADA ]
                         └──────┬───────┘
                                │ selecionada para uma Rodada
                                │ (recebe data_prevista + Roteiro instanciado)
                                ▼
                         ┌──────────────┐
                         │  NA_ESTEIRA  │  ← etapas sendo executadas
                         └──────┬───────┘
                                │ 100% das etapas concluídas (automático)
                                ▼
                         ┌──────────────┐
                         │  CONCLUIDA   │  ← em teste de mercado
                         └──────┬───────┘
                     ┌──────────┴──────────┐
        Chefe/Mestre │                     │ Chefe/Mestre
        marca como   ▼                     ▼  marca como
              ┌───────────┐         ┌──────────────┐
              │ VALIDADA  │         │ INVALIDADA   │
              └───────────┘         └──────────────┘
              (com data_validacao)   (com data_validacao)
```

**Invariante fundamental:** a oferta é **a mesma linha do banco** do começo ao
fim. `NA_PENEIRA` não é uma tabela separada de "ideias" — é apenas o primeiro
status da oferta. Assim todos os dados de origem (descrição, anunciante de
referência, criativo, quem teve a ideia, quando) chegam intactos ao Painel.

---

## 5. Requisitos funcionais

### RF-01 — Autenticação e Equipe

- **RF-01.1** Login por e-mail e senha (Supabase Auth). Sem cadastro público: o
  Chefe convida o membro por e-mail e ele define a senha no primeiro acesso.
- **RF-01.2** Cadastro de membro com: foto, nome, cargo (Chefe/Funcionário),
  **uma ou mais funções**, e-mail, data de entrada, status ativo/inativo.
- **RF-01.3** Upload e recorte da foto (avatar quadrado, armazenado no Supabase
  Storage). A foto é usada como miniatura em todo o app — é ela que o Mestre
  arrasta para delegar etapas.
- **RF-01.4** Desativação em vez de exclusão: membro inativo some dos seletores
  mas continua aparecendo no histórico de etapas que concluiu.
- **RF-01.5** Cada usuário edita o próprio perfil (foto e nome); só o Chefe muda
  cargo e funções.

### RF-02 — Peneira de Ideias

- **RF-02.1** Qualquer membro cadastra uma ideia com:
  - **Nome da oferta** (obrigatório)
  - **Descrição** — o que o produto oferece (obrigatório)
  - **Anunciante de referência** — texto livre + link opcional para a página/anúncio
  - **Criativo de referência** — upload de imagem(ns) ou link
  - **Imagem de capa** — usada nos cards e no Painel; se não enviada, cai num
    placeholder até a geração por IA existir (ver §13)
  - **Nicho / categoria** (opcional, ajuda o filtro do Painel)
- **RF-02.2** Visualização em grade de cards com a capa, nome, autor e data.
  Filtros por autor, nicho e período; busca por nome.
- **RF-02.3** Card exibe selo de estado: `Na Peneira` ou, se já escalada,
  `Na Esteira / Concluída / Validada / Invalidada` com link para a oferta.
- **RF-02.4** Descarte de ideia (soft delete com motivo). Ideia descartada some
  da grade padrão e aparece num filtro "Descartadas".
- **RF-02.5** Ideias já escaladas para uma Rodada ficam bloqueadas para nova
  seleção (não podem entrar em duas Rodadas).

### RF-03 — Roteiros de Montagem

- **RF-03.1** CRUD de Roteiros. Cada Roteiro tem nome, descrição, flag de
  **padrão** (apenas um Roteiro pode ser o padrão) e uma lista ordenada de etapas.
- **RF-03.2** Cada etapa do Roteiro tem: ordem, título, descrição/instrução
  opcional e **uma ou mais funções sugeridas** — são elas que pré-preenchem os
  responsáveis quando a oferta entra na Rodada.
- **RF-03.3** Roteiro padrão do sistema (semeado na instalação):

  | # | Etapa | Função(ões) sugerida(s) |
  |---|---|---|
  | 1 | Criação da página do Facebook | Gestor de Tráfego |
  | 2 | Criação da página do Instagram | Gestor de Tráfego |
  | 3 | Designação e vinculação do número de WhatsApp | Engenheiro de Fluxos |
  | 4 | Verificar coexistência | Engenheiro de Fluxos |
  | 5 | Produção do trio de criativos para teste | Garimpeiro |
  | 6 | Geração do funil | Engenheiro de Fluxos |
  | 7 | Geração e configuração dos entregáveis no funil | Engenheiro de Fluxos **+** Garimpeiro |
  | 8 | Subir campanha de testes | Gestor de Tráfego |

  > A etapa 7 tem dois donos por natureza: o Garimpeiro **gera** os entregáveis e
  > o Engenheiro de Fluxos os **configura** no funil. Por isso etapa comporta
  > mais de um responsável.

- **RF-03.4** Roteiros são **versionados por cópia**: ao entrar na Rodada, as
  etapas são copiadas para a oferta. Editar o Roteiro depois **não** altera
  ofertas já em andamento nem o histórico.
- **RF-03.5** Um Roteiro em uso não pode ser excluído, apenas arquivado.

### RF-04 — Rodadas

- **RF-04.1** Somente Chefe ou Mestre da Esteira cria uma Rodada.
- **RF-04.2** Tela de criação em três passos:
  1. **Identificação** — nome/número da Rodada, data de início, observações.
  2. **Seleção de ofertas** — grade das ideias com status `NA_PENEIRA`;
     seleção múltipla; a ordem de seleção define a ordem na esteira e pode ser
     reordenada.
  3. **Roteiro por oferta** — cada oferta selecionada já vem com o **Roteiro
     padrão** marcado; é possível trocar por outro Roteiro individualmente.
- **RF-04.3** Ao salvar, o sistema:
  - distribui **uma oferta por dia útil** a partir da data de início, pulando
    sábados, domingos e feriados cadastrados;
  - grava `data_prevista` em cada oferta;
  - muda o status das ofertas para `NA_ESTEIRA`;
  - **instancia** as etapas do Roteiro escolhido dentro de cada oferta;
  - pré-preenche os responsáveis: para cada função sugerida da etapa, se existir
    exatamente **um** membro ativo com aquela função, ele já entra como
    responsável; havendo mais de um (ou nenhum), aquela vaga fica aberta para
    delegação.
- **RF-04.4** Prévia do cronograma antes de salvar ("Seg 14/09 — Oferta A; Ter
  15/09 — Oferta B; ...").
- **RF-04.5** Rodada em andamento pode receber nova oferta, ter oferta removida
  (volta para a Peneira) e ser cancelada (todas as ofertas voltam à Peneira,
  desde que nenhuma etapa tenha sido concluída).
- **RF-04.6** Estados da Rodada: `Planejada` → `Em andamento` → `Concluída`
  (automático quando todas as ofertas estão Concluídas ou além) / `Cancelada`.

### RF-05 — Calendário

- **RF-05.1** Visões de mês (padrão) e semana.
- **RF-05.2** Cada dia mostra o card da oferta agendada: capa em miniatura, nome,
  progresso do Roteiro (ex.: 5/8) e as miniaturas dos responsáveis.
- **RF-05.3** Clique no card abre o **popup de detalhe da oferta**, com a
  checklist completa e a miniatura do responsável ao lado de cada etapa.
- **RF-05.4** Chefe e Mestre podem **arrastar** o card para outro dia. O sistema
  bloqueia soltar em fim de semana/feriado e avisa se o dia já tem oferta,
  oferecendo trocar as duas de lugar. Há sempre a alternativa "Mover para…" no
  menu do card (ver [DESIGN.md §6.1](DESIGN.md)).
- **RF-05.5** Cores/etiquetas por status e por Rodada, com legenda visível.
- **RF-05.6** Filtros: por Rodada, por responsável ("mostrar só o que é meu") e
  por status. Tarefas aparecem no dia do prazo, com marcação distinta e
  filtro próprio para ocultar.
- **RF-05.7** Indicador visual de oferta atrasada (data prevista passou e o
  Roteiro não está 100%).

### RF-06 — Tela principal (Oferta do Dia)

- **RF-06.1** Ao abrir o app, o usuário vê a **oferta agendada para hoje**: capa,
  nome, descrição, anunciante de referência, Rodada a que pertence e progresso.
- **RF-06.2** Abaixo, a **checklist da montagem**: cada etapa em uma linha com
  título, caixa de conclusão e, à direita, a **miniatura (foto) do responsável**.
  Etapas com mais de um responsável mostram avatares empilhados; etapas sem dono
  mostram um avatar tracejado.
- **RF-06.3** **Delegação por arrastar:** uma barra com as fotos de todos os
  membros ativos fica fixa no topo da tela. O Chefe/Mestre arrasta a foto de um
  membro e solta sobre a etapa para atribuí-la; soltar mais de um membro na mesma
  etapa acumula responsáveis; remover é pelo próprio avatar na etapa.
  **Obrigatório:** clicar no avatar da etapa abre um seletor equivalente,
  operável por teclado — arrastar nunca é o único caminho (WCAG 2.2 AA).
- **RF-06.4** Marcar/desmarcar etapa registra quem marcou e quando. Funcionário
  só marca etapas em que é um dos responsáveis; Chefe/Mestre marcam qualquer uma.
- **RF-06.5** Quando a última etapa é concluída, a oferta vira `CONCLUIDA`
  automaticamente, com `data_conclusao` = agora, e a interface celebra a conclusão.
- **RF-06.6** Se não houver oferta para hoje, a tela mostra a **próxima oferta
  agendada** e um resumo do que está pendente/atrasado.
- **RF-06.7** Bloco **Minhas Tarefas** — reúne, em uma lista única ordenada por
  data, **as etapas de oferta** em que o usuário é responsável **e as Tarefas**
  designadas a ele. Cada linha identifica a origem (oferta ou tarefa), a data
  e o estado (hoje / amanhã / atrasada).

### RF-07 — Tarefas individuais

- **RF-07.1** Somente **Chefe** e **Mestre da Esteira** criam Tarefas.
  Nenhum outro membro pode designar tarefa para si ou para terceiros.
- **RF-07.2** Campos da Tarefa:
  - **Título** (obrigatório)
  - **Descrição** (opcional)
  - **Responsável(is)** — um ou mais membros ativos (obrigatório)
  - **Prazo** — data de entrega (obrigatório)
  - **Prioridade** — Normal ou Alta
  - **Oferta vinculada** (opcional) — quando a tarefa se relaciona a uma oferta
  - **Anexo** (opcional)
- **RF-07.3** A Tarefa aparece no bloco **Minhas Tarefas** da tela inicial de
  cada responsável, misturada às etapas de oferta e ordenada por data.
- **RF-07.4** O responsável marca como concluída (registra quem e quando).
  Chefe e Mestre também podem concluir em nome de qualquer um.
- **RF-07.5** Estados: `Aberta` → `Concluída` / `Cancelada`. **Atrasada** é um
  estado derivado (prazo venceu e não foi concluída), não um valor gravado.
- **RF-07.6** Listagem própria em `/tarefas` com filtros por responsável,
  estado e período. Chefe e Mestre veem todas; funcionário vê as suas.
- **RF-07.7** Tarefas aparecem no calendário na data do prazo, visualmente
  distintas dos cards de oferta.
- **RF-07.8** Contam na produtividade do Painel, contabilizadas separadamente das
  etapas de oferta.
- **RF-07.9** Notificação ao membro no momento da designação (fase de acabamento).

### RF-08 — Ofertas

- **RF-08.1** Listagem geral com abas/filtros por status: `Na Peneira`,
  `Na Esteira`, `Concluída`, `Validada`, `Invalidada`, `Descartada`.
- **RF-08.2** Filtros combináveis: Rodada, período (por data de criação,
  conclusão ou validação), autor da ideia, responsável, nicho.
- **RF-08.3** Página de detalhe da oferta com quatro blocos:
  - **Origem** — dados vindos da Peneira (editáveis só por Chefe/Mestre)
  - **Montagem** — Roteiro, etapas, responsáveis, datas
  - **Resultado** — validação, data de validação, observações do teste
  - **Histórico** — linha do tempo de eventos (criada, escalada, etapa concluída,
    remanejada, concluída, validada/invalidada)
- **RF-08.4** **Validação:** Chefe ou Mestre marca a oferta como `Validada` ou
  `Invalidada`, informando obrigatoriamente a **data da validação** (permite data
  retroativa) e, opcionalmente, uma observação. A mudança pode ser desfeita e
  fica registrada no histórico.
- **RF-08.5** Exportação da listagem filtrada em CSV.

### RF-09 — Painel

Filtro global de período (padrão: mês corrente; atalhos de 7/30/90 dias e
intervalo personalizado).

- **RF-09.1** Cartões de indicador:
  - Ofertas **concluídas** no período
  - Ofertas **na esteira** agora (número absoluto, ignora o filtro de período)
  - Ofertas **validadas** no período
  - **Taxa de validação** = validadas ÷ (validadas + invalidadas) no período
  - **Tempo médio** da Peneira até Concluída (em dias)
- **RF-09.2** **Galeria de Validadas** — grade com a **imagem e o nome** de cada
  oferta validada no período; clicar abre o detalhe.
- **RF-09.3** Gráfico de linha com ofertas concluídas por semana.
- **RF-09.4** Funil do período: cadastradas → escaladas → concluídas → validadas.
- **RF-09.5** Produtividade por membro: etapas de oferta concluídas e Tarefas
  entregues no período (com foto), apresentado como volume de trabalho, não como
  ranking competitivo.
- **RF-09.6** Alertas: ofertas atrasadas, etapas sem responsável em oferta ativa,
  Tarefas vencidas, ofertas concluídas há mais de N dias sem validação.

### RF-10 — Configurações

- **RF-10.1** Cadastro de feriados (data + descrição) usado pela distribuição da
  Rodada e pelo calendário.
- **RF-10.2** Definição do Roteiro padrão.
- **RF-10.3** Prazo em dias após o qual uma oferta Concluída sem validação vira
  alerta no Painel.

### RF-11 — Notificações (fase posterior)

- **RF-11.1** Sino no app: você foi designado a uma etapa ou a uma Tarefa;
  sua tarefa está atrasada; a oferta do dia começou.
- **RF-11.2** Resumo diário opcional por e-mail para o Mestre da Esteira.

---

## 6. Requisitos não funcionais

| # | Requisito |
|---|---|
| RNF-01 | Interface em português do Brasil; datas e números no formato pt-BR; fuso America/Sao_Paulo fixado no servidor e no cliente |
| RNF-02 | Desktop-first (a operação diária é em desktop), mas responsivo até 375px — com alternativa de clique/teclado onde há arrastar |
| RNF-03 | Toda página carrega em menos de 2s em conexão comum; dados servidos por Server Components com cache; CLS < 0,1 |
| RNF-04 | Autorização aplicada **no banco** via Row Level Security, não só na UI |
| RNF-05 | Nenhuma exclusão física de oferta, membro, Rodada ou Tarefa — sempre soft delete/arquivamento |
| RNF-06 | Todo evento relevante do ciclo de vida gravado em tabela de histórico com autor e timestamp |
| RNF-07 | Imagens redimensionadas no upload (capa ≤ 1200px, avatar 400×400), servidas por CDN em WebP/AVIF |
| RNF-08 | Suporte a Chrome, Edge e Firefox atualizados |
| RNF-09 | Backup diário automático do Postgres (recurso do Supabase) |
| RNF-10 | Acessibilidade conforme o checklist de [DESIGN.md §7](DESIGN.md) — WCAG 2.1 AA, mais o critério 2.5.7 (Dragging Movements) do WCAG 2.2 |

---

## 7. Modelo de dados

### 7.1 Enums

```sql
create type cargo            as enum ('CHEFE', 'FUNCIONARIO');
create type funcao           as enum ('MESTRE_ESTEIRA', 'GESTOR_TRAFEGO', 'GARIMPEIRO', 'ENGENHEIRO_FLUXOS');
create type oferta_status    as enum ('NA_PENEIRA', 'NA_ESTEIRA', 'CONCLUIDA', 'VALIDADA', 'INVALIDADA', 'DESCARTADA');
create type rodada_status    as enum ('PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');
create type tarefa_status as enum ('ABERTA', 'CONCLUIDA', 'CANCELADA');
create type prioridade       as enum ('NORMAL', 'ALTA');
```

### 7.2 Tabelas

**`membros`** — perfil ligado 1:1 a `auth.users`

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| nome | text | |
| email | text | |
| cargo | cargo | único por pessoa |
| foto_url | text | Supabase Storage |
| ativo | boolean | default true |
| entrou_em | date | |
| criado_em | timestamptz | |

**`membro_funcoes`** — N:N, um membro pode acumular funções

| coluna | tipo |
|---|---|
| membro_id | uuid FK → membros |
| funcao | funcao |
| *PK composta* | (membro_id, funcao) |

**`roteiros`**

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| nome | text | |
| descricao | text | |
| e_padrao | boolean | índice único parcial garante só um `true` |
| arquivado | boolean | |
| criado_por | uuid FK → membros | |
| criado_em | timestamptz | |

**`roteiro_etapas`**

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| roteiro_id | uuid FK → roteiros | on delete cascade |
| ordem | int | |
| titulo | text | |
| descricao | text | instrução opcional |

**`roteiro_etapa_funcoes`** — funções sugeridas por etapa (N:N)

| coluna | tipo |
|---|---|
| roteiro_etapa_id | uuid FK → roteiro_etapas |
| funcao | funcao |
| *PK composta* | (roteiro_etapa_id, funcao) |

**`rodadas`**

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| nome | text | ex.: "Rodada #12" |
| data_inicio | date | |
| observacoes | text | |
| status | rodada_status | |
| criada_por | uuid FK → membros | |
| criada_em | timestamptz | |

**`ofertas`** — entidade central, atravessa todo o ciclo

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| nome | text | |
| descricao | text | o que o produto oferece |
| anunciante_referencia | text | |
| url_referencia | text | |
| capa_url | text | imagem exibida em cards e Painel |
| nicho | text | nullable |
| status | oferta_status | default `NA_PENEIRA` |
| criada_por | uuid FK → membros | quem teve a ideia |
| criada_em | timestamptz | entrada na Peneira |
| rodada_id | uuid FK → rodadas | nullable |
| roteiro_id | uuid FK → roteiros | roteiro usado na montagem |
| ordem_na_rodada | int | nullable |
| data_prevista | date | dia na esteira |
| escalada_em | timestamptz | saída da Peneira |
| data_conclusao | timestamptz | virou Concluída |
| data_validacao | date | preenchida ao Validar/Invalidar |
| observacao_validacao | text | |
| motivo_descarte | text | |

**`oferta_etapas`** — cópia viva do Roteiro dentro da oferta

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| oferta_id | uuid FK → ofertas | on delete cascade |
| roteiro_etapa_id | uuid | referência de origem, nullable |
| ordem | int | |
| titulo | text | copiado |
| descricao | text | copiado |
| concluida | boolean | default false |
| concluida_em | timestamptz | |
| concluida_por | uuid FK → membros | |

**`oferta_etapa_responsaveis`** — uma etapa pode ter mais de um dono

| coluna | tipo | notas |
|---|---|---|
| oferta_etapa_id | uuid FK → oferta_etapas | on delete cascade |
| membro_id | uuid FK → membros | |
| origem | text | `SUGERIDO` (pré-preenchido pela função) ou `DELEGADO` (arrastado) |
| *PK composta* | (oferta_etapa_id, membro_id) | |

**`tarefas`** — tarefas individuais fora da esteira

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| titulo | text | |
| descricao | text | |
| prazo | date | |
| prioridade | prioridade | default `NORMAL` |
| oferta_id | uuid FK → ofertas | nullable, vínculo opcional |
| anexo_url | text | nullable |
| status | tarefa_status | default `ABERTA` |
| criada_por | uuid FK → membros | só Chefe ou Mestre |
| criada_em | timestamptz | |
| concluida_em | timestamptz | |
| concluida_por | uuid FK → membros | |
| motivo_cancelamento | text | |

**`tarefa_responsaveis`**

| coluna | tipo |
|---|---|
| tarefa_id | uuid FK → tarefas |
| membro_id | uuid FK → membros |
| *PK composta* | (tarefa_id, membro_id) |

**`oferta_anexos`**

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| oferta_id | uuid FK → ofertas | |
| tipo | text | CRIATIVO ou REFERENCIA |
| url | text | |
| enviado_por | uuid FK → membros | |
| enviado_em | timestamptz | |

**`oferta_eventos`** — histórico/auditoria

| coluna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| oferta_id | uuid FK → ofertas | |
| tipo | text | CRIADA, ESCALADA, ETAPA_CONCLUIDA, ETAPA_DELEGADA, REMANEJADA, CONCLUIDA, VALIDADA, INVALIDADA, DESCARTADA |
| detalhe | jsonb | payload livre |
| autor_id | uuid FK → membros | |
| ocorrido_em | timestamptz | |

**`feriados`**

| coluna | tipo |
|---|---|
| data | date PK |
| descricao | text |

**`configuracoes`** — chave/valor único da instalação

| coluna | tipo |
|---|---|
| chave | text PK |
| valor | jsonb |

### 7.3 Relacionamentos

```
auth.users 1─1 membros 1─N membro_funcoes
membros    1─N ofertas                    (criada_por)
membros    N─N oferta_etapas              (via oferta_etapa_responsaveis)
membros    N─N tarefas                 (via tarefa_responsaveis)
rodadas    1─N ofertas
roteiros   1─N roteiro_etapas 1─N roteiro_etapa_funcoes
roteiros   1─N ofertas                    (roteiro escolhido na Rodada)
ofertas    1─N oferta_etapas
ofertas    1─N oferta_anexos
ofertas    1─N oferta_eventos
ofertas    1─N tarefas                 (vínculo opcional)
```

---

## 8. Regras de negócio

| # | Regra |
|---|---|
| RN-01 | Uma oferta só entra em uma Rodada se estiver `NA_PENEIRA`; nunca em duas Rodadas ao mesmo tempo |
| RN-02 | A distribuição da Rodada aloca **uma oferta por dia útil**, pulando sábado, domingo e feriados cadastrados |
| RN-03 | Dois cards no mesmo dia só existem por ação manual do Mestre, e a UI avisa |
| RN-04 | As etapas são **copiadas** do Roteiro para a oferta no momento da escalação; alterações posteriores no Roteiro não retroagem |
| RN-05 | Para cada função sugerida da etapa, o responsável é pré-preenchido apenas quando existe exatamente um membro ativo com aquela função |
| RN-06 | Uma etapa pode ter mais de um responsável; um membro pode ser responsável por várias etapas |
| RN-07 | Funcionário só marca etapas em que é um dos responsáveis; Chefe e Mestre marcam qualquer etapa |
| RN-08 | Quando todas as etapas de uma oferta estão concluídas, a oferta vira `CONCLUIDA` automaticamente e grava `data_conclusao` |
| RN-09 | Desmarcar uma etapa de oferta `CONCLUIDA` a devolve para `NA_ESTEIRA` e limpa `data_conclusao` — bloqueado se a oferta já foi Validada/Invalidada |
| RN-10 | Só Chefe e Mestre validam ou invalidam, e `data_validacao` é obrigatória |
| RN-11 | Uma Rodada vira `CONCLUIDA` quando todas as suas ofertas estão `CONCLUIDA` ou além |
| RN-12 | Cancelar Rodada devolve as ofertas para `NA_PENEIRA`, desde que nenhuma etapa tenha sido concluída; caso contrário exige confirmação e mantém o histórico |
| RN-13 | Só Chefe e Mestre criam, editam e cancelam Tarefas; o responsável só pode concluí-las |
| RN-14 | "Atrasada" nunca é gravado — é derivado da data prevista/prazo versus a conclusão |
| RN-15 | Membro desativado é removido dos seletores de delegação, mas permanece em etapas e Tarefas passadas |
| RN-16 | Toda transição de status grava um registro em `oferta_eventos` |
| RN-17 | Só um Roteiro pode ter `e_padrao = true` |

---

## 9. Arquitetura técnica

### 9.1 Stack

| Camada | Escolha |
|---|---|
| Framework | Next.js 16 (App Router, Server Components e Server Actions) |
| Linguagem | TypeScript (strict) |
| Estilo | Tailwind CSS + shadcn/ui, com os tokens de [DESIGN.md](DESIGN.md) |
| Banco | Postgres gerenciado (Supabase) |
| Autenticação | Supabase Auth (e-mail/senha + convite) |
| Arquivos | Supabase Storage (buckets `avatares` e `ofertas`) |
| Autorização | Row Level Security no Postgres |
| Calendário | FullCalendar ou construção própria com `date-fns` |
| Arrastar e soltar | `@dnd-kit/core` com `PointerSensor` + `KeyboardSensor` |
| Tabelas | shadcn `Table` + TanStack Table (padrão DataTable) |
| Formulários | React Hook Form + Zod |
| Gráficos | Recharts |
| Ícones | Lucide |
| Deploy | Vercel |
| Datas | `date-fns` + `date-fns-tz` fixados em America/Sao_Paulo |

### 9.2 Estrutura de pastas

```
steera/
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   └── (app)/
│   │       ├── page.tsx              → Oferta do Dia + Minhas Tarefas
│   │       ├── calendario/
│   │       ├── peneira/
│   │       ├── rodadas/
│   │       │   ├── page.tsx
│   │       │   ├── nova/             → assistente de 3 passos
│   │       │   └── [id]/
│   │       ├── ofertas/
│   │       │   ├── page.tsx
│   │       │   └── [id]/
│   │       ├── tarefas/
│   │       ├── painel/
│   │       ├── equipe/
│   │       └── configuracoes/
│   │           ├── roteiros/
│   │           └── feriados/
│   ├── components/
│   │   ├── ui/                       → shadcn
│   │   ├── oferta/                   → OfertaCard, ChecklistMontagem, DropResponsavel
│   │   ├── tarefa/
│   │   ├── calendario/
│   │   ├── painel/                   → StatCard, GraficoConcluidas, Funil
│   │   └── equipe/                   → AvatarMembro, BarraMembros
│   ├── lib/
│   │   ├── supabase/                 → clients server/browser
│   │   ├── auth/                     → sessão e checagem de permissão
│   │   ├── agenda.ts                 → cálculo de dias úteis e distribuição
│   │   └── dominio/                  → tipos e transições de status
│   └── actions/                      → Server Actions por módulo
├── supabase/
│   ├── migrations/
│   └── seed.sql                      → Roteiro padrão, funções, chefe inicial
└── docs/
    ├── PLANEJAMENTO.md
    └── DESIGN.md
```

### 9.3 Segurança

- Todas as tabelas com RLS ativo. Leitura liberada para qualquer membro ativo
  autenticado; escrita restrita por funções SQL auxiliares `e_chefe()` e
  `e_mestre_ou_chefe()`, que leem o cargo e as funções do `auth.uid()`.
- Server Actions revalidam a permissão no servidor antes de qualquer escrita — a
  UI escondida nunca é a única barreira.
- Buckets do Storage privados, servidos por URL assinada.
- Mutações que envolvem várias tabelas (escalar Rodada, concluir oferta) rodam
  como funções Postgres transacionais, evitando estado meio-gravado.

---

## 10. Telas

| Tela | Rota | Quem acessa | Conteúdo |
|---|---|---|---|
| Login | `/login` | todos | e-mail/senha, recuperação |
| **Oferta do Dia** | `/` | todos | oferta de hoje, checklist com fotos, barra de membros, Minhas Tarefas |
| Calendário | `/calendario` | todos | mês/semana, cards arrastáveis, filtros, popup de detalhe |
| Peneira de Ideias | `/peneira` | todos | grade de cards, cadastro de ideia, filtros |
| Rodadas | `/rodadas` | todos (criação: Chefe/Mestre) | lista de rodadas e progresso |
| Nova Rodada | `/rodadas/nova` | Chefe/Mestre | assistente: identificação → seleção → roteiro → prévia |
| Detalhe da Rodada | `/rodadas/[id]` | todos | cronograma, progresso por oferta, ações de gestão |
| Ofertas | `/ofertas` | todos | listagem com abas por status e filtros |
| Detalhe da Oferta | `/ofertas/[id]` | todos | origem, montagem, resultado, histórico |
| **Tarefas** | `/tarefas` | Chefe/Mestre veem todas; demais veem as suas | lista, criação e conclusão de tarefas individuais |
| Painel | `/painel` | todos | indicadores, galeria de Validadas, gráficos, alertas |
| Equipe | `/equipe` | todos (edição: Chefe) | grade de membros com foto, cargo e funções |
| Roteiros | `/configuracoes/roteiros` | Chefe/Mestre | CRUD de roteiros e etapas |
| Feriados | `/configuracoes/feriados` | Chefe | calendário de feriados |

### 10.1 Esboço da tela principal

```
┌──────────────────────────────────────────────────────────────────────────┐
│  STEERA   Hoje  Calendário  Peneira  Rodadas  Ofertas  Tarefas  Painel   │
├──────────────────────────────────────────────────────────────────────────┤
│  Equipe (arraste para delegar):   (o) (o) (o) (o) (o)                    │
├──────────────────────────────────────────────────────────────────────────┤
│  OFERTA DE HOJE · Quinta, 10/09 · Rodada #12                             │
│  ┌────────┐  Detox Turbo 30 dias                        ▓▓▓▓▓░░░  5/8    │
│  │  capa  │  Suplemento natural com promessa de ...                      │
│  │        │  Referência: @anunciante_x                                   │
│  └────────┘                                                              │
│                                                                          │
│  ROTEIRO DE MONTAGEM · Oferta padrão                                     │
│  [x] 1  Criação da página do Facebook                             (o)    │
│  [x] 2  Criação da página do Instagram                            (o)    │
│  [x] 3  Designação e vinculação do número de WhatsApp             (o)    │
│  [x] 4  Verificar coexistência                                    (o)    │
│  [x] 5  Produção do trio de criativos para teste                  (o)    │
│  [ ] 6  Geração do funil                                          (o)    │
│  [ ] 7  Geração e configuração dos entregáveis no funil          (o)(o)  │ <- dois donos
│  [ ] 8  Subir campanha de testes                                  ( ? )  │ <- sem dono
├──────────────────────────────────────────────────────────────────────────┤
│  MINHAS TAREFAS  ·  4 abertas                                            │
│  [ ] Geração do funil            oferta · Detox Turbo      hoje          │
│  [ ] Revisar copy do criativo    tarefa                    hoje  ALTA   │
│  [ ] Subir campanha de testes    oferta · Sono Profundo    amanhã        │
│  [ ] Trio de criativos           oferta · Cabelo Forte   atrasada (!)    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Design e interface

O design system completo está em **[docs/DESIGN.md](DESIGN.md)**, gerado com a
skill `ui-ux-pro-max` (instalada em `~/.claude/skills/ui-ux-pro-max`). Resumo das
decisões:

| Dimensão | Decisão | Origem |
|---|---|---|
| Tipo de produto | Productivity Tool / Internal Dashboard | base `products.csv` |
| Estilo | Flat Design + Micro-interactions; secundário Minimalism & Swiss | recomendação para o tipo de produto |
| Paleta base | "Industrial slate" — `#334155` primário sobre `#F8FAFC` | base `colors.csv` (Inventory & Stock Management) |
| Acento / marca | Âmbar `#D97706` claro / `#F59E0B` escuro, sempre com texto escuro por cima | base `colors.csv` (Analytics Dashboard) |
| Tipografia | **Fira Code** (títulos, números, progresso) + **Fira Sans** (corpo e labels) | pareamento "Dashboard Data" |
| Ícones | Lucide, 20px, stroke 1.75 — nunca emoji | regra `no-emoji-icons` |
| Temas | Claro e escuro, ambos definidos por tokens semânticos, testados separadamente | regra `color-dark-mode` |
| Movimento | 150–300ms, só `transform`/`opacity`, respeitando `prefers-reduced-motion` | regras de animação |
| Gráficos | Linha para tendência, Funil para conversão, stat cards para KPI, sempre com tabela equivalente | base `charts.csv` |

**Restrição de acessibilidade que molda a arquitetura:** o WCAG 2.2 AA
(critério 2.5.7) exige alternativa de ponteiro único para qualquer operação de
arrastar. Como o Steera usa arrastar em três lugares — delegar responsável,
remanejar oferta no calendário e reordenar ofertas na Rodada —, **cada um deles
precisa de um caminho equivalente por clique e por teclado**. Isso não é polimento
de fase final: entra junto com a funcionalidade.

---

## 12. Roadmap

| Fase | Entrega | Depende de |
|---|---|---|
| **0 — Fundação** | Projeto Next.js, Supabase, migrações, seed do Roteiro padrão, tokens de design, layout e navegação, login | — |
| **1 — Equipe** | CRUD de membros, upload de foto, cargo e múltiplas funções, convite, RLS | 0 |
| **2 — Peneira** | Cadastro e grade de ideias, upload de criativo e capa, filtros, descarte | 1 |
| **3 — Roteiros** | CRUD de roteiros e etapas com funções sugeridas, definição do padrão | 1 |
| **4 — Rodadas** | Assistente de criação, seleção de ofertas, troca de roteiro, distribuição em dias úteis, instanciação das etapas | 2, 3 |
| **5 — Oferta do Dia** | Home com checklist, delegação (arrastar + alternativa acessível), conclusão de etapas, transição automática para Concluída | 4 |
| **6 — Tarefas** | CRUD de tarefas individuais, integração no bloco Minhas Tarefas | 5 |
| **7 — Calendário** | Mês/semana, cards, popup de detalhe, remanejamento, filtros | 4 |
| **8 — Ofertas** | Listagem por status, detalhe completo, validação, histórico | 5 |
| **9 — Painel** | Indicadores, galeria de Validadas, gráficos, funil, alertas, exportação | 8 |
| **10 — Acabamento** | Notificações, feriados, responsividade fina, passada final de acessibilidade | 9 |

> **MVP utilizável** = fases 0 a 6. Com isso a equipe já roda o dia a dia
> completo: ideia → rodada → montagem → tarefa individual. Calendário, Painel e
> validação entram na sequência sem retrabalho, porque o modelo de dados já os
> contempla desde a fase 0.

---

## 13. Evoluções previstas (fora do escopo inicial)

- **Geração de imagem por IA** — ao cadastrar a ideia na Peneira, gerar
  automaticamente a capa a partir do nome e da descrição da oferta. O modelo de
  dados já está preparado: `capa_url` é apenas mais uma origem de imagem, e o
  fluxo previsto é gerar de forma assíncrona após o cadastro, com opção de
  regenerar ou substituir por upload manual.
- Métricas de performance da oferta (investimento, faturamento, ROI) alimentando
  o critério de validação em vez do julgamento manual.
- Integração com a API de anúncios para puxar status de campanha.
- Comentários por oferta e por etapa.
- App móvel ou PWA com notificações push.
- Clonagem de oferta Validada para variações de escala.

---

## 14. Decisões pendentes

1. **"Roteiro de Montagem"** para o template de checklist — aprovado?
2. **Sábado é dia útil?** Assumi que não. Se a equipe trabalha aos sábados, muda
   a regra RN-02.
3. **Quantas pessoas por função hoje?** Se cada função tem uma pessoa só, o
   pré-preenchimento resolve quase tudo sozinho e o arrastar vira exceção. Se há
   várias, o arrastar é o caminho principal.
4. **Etapa 7 com dois donos** — confirmei a leitura de que Garimpeiro gera os
   entregáveis e Engenheiro de Fluxos configura no funil. Se na prática é só o
   Engenheiro de Fluxos, simplifico.
5. **Critério de validação** — é julgamento manual do Chefe, ou existe um número
   (faturamento, ROI, vendas) que decide?
6. **Oferta Invalidada pode voltar para a Peneira** para nova tentativa com outro
   ângulo, ou fica encerrada?
7. **Criativo de referência** — só imagem, ou precisa aceitar vídeo? Vídeo muda a
   estratégia de storage e de exibição.
8. **Tarefa pode ter mais de um responsável?** Modelei que sim; se na prática
   é sempre uma pessoa, simplifico para um campo direto.
9. **Uso em celular** — é uso real do dia a dia ou consulta eventual?
10. **Chefe é uma pessoa só?** Se sim, simplifica a tela de equipe.
