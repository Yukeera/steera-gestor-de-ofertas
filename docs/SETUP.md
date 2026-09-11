# Steera — Guia de instalação

O que precisa ser feito uma vez, por você, antes de o app rodar.

---

## 1. Criar o projeto no Supabase

1. Entre em [supabase.com/dashboard](https://supabase.com/dashboard) e crie um
   projeto novo.
   - **Nome:** `steera`
   - **Região:** `South America (São Paulo)` — menor latência para a equipe
   - **Senha do banco:** gere uma forte e guarde no seu gerenciador de senhas
2. Espere o provisionamento terminar (~2 minutos).

## 2. Pegar as chaves

Em **Project Settings → API Keys**, copie:

| Campo no painel | Vai para |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| **Publishable key** (`sb_publishable_…`) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| **Secret key** (`sb_secret_…`) | `SUPABASE_SECRET_KEY` |

> **Não use as chaves legadas.** O painel ainda mostra uma aba com as antigas
> `anon` e `service_role` em formato JWT. Elas funcionam, mas o Supabase as
> desativa até o fim de 2026. Projeto novo já nasce nas chaves novas.
>
> A **publishable** vai para o navegador de propósito — quem protege os dados é
> o RLS, não o sigilo dela. A **secret** carrega `BYPASSRLS` e ignora toda
> política do banco: fica só no servidor, nunca no cliente, nunca no git.

## 3. Preencher o `.env.local`

Copie `.env.example` para `.env.local` na raiz do projeto e cole os três valores:

```bash
cp .env.example .env.local
```

## 4. Aplicar o schema

**Opção A — Supabase CLI (recomendado):**

```bash
npx supabase link --project-ref SEU_PROJECT_REF
```

```bash
npx supabase db push
```

**Opção B — pelo painel:** abra **SQL Editor** e rode, nesta ordem, o conteúdo de:

1. `supabase/migrations/20260911000001_schema.sql`
2. `supabase/migrations/20260911000002_rls.sql`
3. `supabase/migrations/20260911000003_regras.sql`
4. `supabase/seed.sql`

## 5. Criar os buckets de arquivo

Em **Storage**, crie dois buckets **privados**:

- `avatares` — fotos da equipe
- `ofertas` — capas e criativos

## 6. Criar o primeiro Chefe

1. Em **Authentication → Users → Add user**, crie seu usuário com e-mail e senha.
   Marque *Auto Confirm User*.
2. Abra `supabase/bootstrap.sql`, troque o e-mail e o nome no topo do arquivo, e
   rode no **SQL Editor**.

Isso cria seu registro em `membros` com cargo **Chefe** e função **Mestre da
Esteira**. A partir daí, todos os outros membros são convidados pela própria tela
de Equipe do app.

## 7. Rodar

```bash
npm run dev
```

---

## Checklist rápido

- [ ] Projeto Supabase criado na região de São Paulo
- [ ] `.env.local` com as três chaves
- [ ] As três migrations aplicadas, na ordem
- [ ] `seed.sql` rodado (cria o Roteiro padrão de 8 etapas)
- [ ] Buckets `avatares` e `ofertas` criados como privados
- [ ] Primeiro usuário criado e promovido com `bootstrap.sql`
