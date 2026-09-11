# Steera

Gestor do fluxo de trabalho de uma equipe de marketing digital, organizado como
uma **esteira de ofertas**: ideias entram cruas na Peneira, o Mestre da Esteira
separa um lote numa Rodada, a Rodada é distribuída um dia útil por vez, e cada
oferta percorre um Roteiro de Montagem com dono definido em cada etapa.

```
Peneira de Ideias  →  Rodada  →  Na Esteira  →  Concluída  →  Validada
                                                           ↘  Invalidada
```

## Documentação

| Documento | O que tem |
|---|---|
| [docs/PLANEJAMENTO.md](docs/PLANEJAMENTO.md) | Requisitos, modelo de dados, regras de negócio, roadmap |
| [docs/DESIGN.md](docs/DESIGN.md) | Design system: paleta, tipografia, padrões de componente, acessibilidade |
| [docs/SETUP.md](docs/SETUP.md) | Como conectar o Supabase e criar o primeiro Chefe |

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) + TypeScript
- **Tailwind 4** + **shadcn/ui** + Lucide
- **Supabase** — Postgres com Row Level Security, Auth e Storage
- **dnd-kit** para arrastar e soltar, **Recharts** para o Painel,
  **TanStack Table** para listagens, **React Hook Form + Zod** para formulários

## Começando

```bash
npm install
```

Conecte o Supabase seguindo [docs/SETUP.md](docs/SETUP.md) — sem isso o app abre
numa tela explicando o que falta.

```bash
npm run dev
```

## Estrutura

```
src/
├── app/
│   ├── (app)/          telas autenticadas, dentro do shell de navegação
│   ├── (auth)/         login
│   └── globals.css     tokens de design (ver docs/DESIGN.md)
├── actions/            Server Actions por módulo
├── components/         componentes de domínio + ui/ do shadcn
├── lib/
│   ├── auth/           sessão e checagem de permissão
│   ├── dominio/        enums, rótulos e transições de status
│   └── supabase/       clients server e browser
└── proxy.ts            renova a sessão e barra rota privada

supabase/
├── migrations/         schema, RLS e regras de negócio
├── seed.sql            Roteiro padrão, configurações, feriados
└── bootstrap.sql       cria o primeiro Chefe (rodar uma vez, à mão)
```

## Onde a autorização mora

A UI esconde botões, mas quem decide é o banco. Toda tabela tem RLS, e as
políticas se apoiam em `e_chefe()` e `e_mestre_ou_chefe()`. Server Actions
revalidam a permissão antes de escrever. Se uma regra não estiver no Postgres,
ela não está garantida.

