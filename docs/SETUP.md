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

Pelo CLI, que é o que mantém o histórico de migrations em dia. O CLI já está
como dependência de desenvolvimento do projeto.

**4.1 — Autenticar** (abre o navegador, uma vez por máquina):

```bash
npx supabase login
```

**4.2 — Ligar o repositório ao projeto.** O `project-ref` é o subdomínio da sua
Project URL: em `https://abcdefgh.supabase.co`, é `abcdefgh`. O comando pede a
senha do banco que você guardou no passo 1.

```bash
npm run db:link -- --project-ref SEU_PROJECT_REF
```

**4.3 — Aplicar migrations e seed:**

```bash
npm run db:push
```

**4.4 — Conferir:**

```bash
npm run db:status
```

As três migrations devem aparecer com a mesma versão em `Local` e `Remote`.

> Daqui para frente, toda mudança de banco é um arquivo novo em
> `supabase/migrations/` seguido de `npm run db:push`. Nunca altere uma migration
> já aplicada — o CLI compara pelo histórico e vai reclamar.

## 5. Configurar os links de e-mail

Sem isso, o convite chega mas o link não funciona.

**5.1 — URLs permitidas.** Em **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` (em produção, a URL real)
- **Redirect URLs:** adicione as duas linhas abaixo

```
http://localhost:3000/auth/entrada
http://localhost:3000/auth/confirm
```

Endereço fora dessa lista é ignorado pelo Supabase, que joga a pessoa na Site URL.

**5.2 — Template: não precisa mexer.** O app funciona com o template padrão.

> **Por que isso importa.** O painel do Supabase só libera a edição de templates
> com SMTP próprio configurado. O template padrão devolve a sessão no *fragmento*
> da URL (`#access_token=…`), e o navegador nunca manda fragmento para o
> servidor. Por isso o link do convite aponta para `/auth/entrada`, que é página
> e roda no navegador, onde o fragmento existe.
>
> Se um dia você configurar SMTP próprio e quiser o formato mais moderno, troque
> o link do template por
> `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/definir-senha`.
> A rota de servidor `/auth/confirm` já existe e assume esse formato sozinha.

**5.3 — SMTP próprio: obrigatório antes de convidar a equipe.**

O SMTP embutido do Supabase é só para teste: limita a poucos e-mails por hora e
**só entrega para endereços que são membros do projeto no Supabase**. Convite para
um e-mail de fora simplesmente não sai.

### Resend, passo a passo

**a) Criar a conta.** Em [resend.com](https://resend.com), plano gratuito —
3.000 e-mails por mês, mais do que suficiente para convites de equipe.

**b) Verificar o domínio.** Em **Domains → Add Domain**, informe o domínio da
empresa. O Resend mostra três registros para publicar no seu DNS:

| Tipo | Para que serve |
|---|---|
| `TXT` (SPF) | diz quais servidores podem enviar em nome do domínio |
| `TXT` (DKIM) | assina cada mensagem, provando que não foi forjada |
| `TXT` (DMARC) | diz ao destinatário o que fazer quando SPF ou DKIM falham |

Publique os três exatamente como o painel mostrar e clique em **Verify**. A
propagação costuma levar minutos, mas pode chegar a algumas horas.

> **Por que não dá para pular.** Sem esses registros o Resend recusa o envio, e
> mesmo que aceitasse o Gmail e o Outlook mandariam para spam. Um convite que cai
> em spam é pior do que um convite que não sai: ninguém fica sabendo.

**c) Gerar a chave.** Em **API Keys → Create API Key**, permissão de envio. Ela
aparece **uma vez só** — guarde no seu gerenciador de senhas.

**d) Configurar no Supabase.** Em **Authentication → Emails → SMTP Settings**,
ative *Enable Custom SMTP* e preencha:

| Campo | Valor |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | a API key gerada no passo (c) |
| Sender email | `acesso@seudominio.com.br` — precisa ser do domínio verificado |
| Sender name | `Steera` |

**e) Ajustar o limite de envio.** Em **Authentication → Rate Limits**, o Supabase
mantém **30 e-mails por hora** mesmo com SMTP próprio. É proteção de reputação
para serviço novo, mas trava o dia em que você convidar a equipe inteira de uma
vez. Suba conforme o tamanho do time.

**f) Testar.** Volte ao Steera, em **Equipe → Convidar membro**, e convide um
e-mail que **não** seja membro do projeto Supabase — é esse o caso que o SMTP
embutido não cobria. Se chegar, está resolvido.

> **Um bônus que isso destrava:** com SMTP próprio, o painel libera a edição dos
> templates de e-mail. Não é obrigatório mexer — o app funciona com o padrão. Mas
> se quiser o formato mais moderno, troque o link do template de convite por
> `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/definir-senha`.
> A rota `/auth/confirm` já existe e assume esse formato sozinha.

## 6. Criar os buckets de arquivo

As migrations já criam os buckets `avatares` e `ofertas` como privados, com
limite de tamanho e tipos permitidos. Não é preciso criar nada à mão — só
confira em **Storage** que os dois aparecem.

## 7. Criar o primeiro Chefe

1. Em **Authentication → Users → Add user**, crie seu usuário com e-mail e senha.
   Marque *Auto Confirm User*.
2. Abra `supabase/bootstrap.sql`, troque o e-mail e o nome no topo do arquivo, e
   rode no **SQL Editor**.

Isso cria seu registro em `membros` com cargo **Chefe** e função **Mestre da
Esteira**. A partir daí, todos os outros membros são convidados pela própria tela
de Equipe do app.

## 8. Rodar

```bash
npm run dev
```

---

## Checklist rápido

- [ ] Projeto Supabase criado na região de São Paulo
- [ ] `.env.local` com as chaves publishable e secret
- [ ] `npm run db:push` rodado e `npm run db:status` com local = remote
- [ ] Site URL e Redirect URLs (`/auth/entrada` e `/auth/confirm`) configuradas
- [ ] Domínio verificado no Resend (SPF, DKIM e DMARC publicados)
- [ ] SMTP próprio no Supabase e limite de envio ajustado em Rate Limits
- [ ] Buckets `avatares` e `ofertas` visíveis em Storage
- [ ] Primeiro usuário criado e promovido com `bootstrap.sql`
