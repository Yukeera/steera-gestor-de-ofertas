# Steera — Publicar na Vercel

A equipe precisa de uma URL, não do seu `localhost`. Este é o caminho do
primeiro deploy e do que vem depois.

---

## 1. Subir o código

O repositório já existe em `Yukeera/steera-gestor-de-ofertas`. Confirme que está
sincronizado:

```bash
git push
```

> `.env.local` **não** sobe — está no `.gitignore`. As chaves vão direto na
> Vercel, no passo 3.

## 2. Criar o projeto na Vercel

Em [vercel.com/new](https://vercel.com/new), importe o repositório. A Vercel
detecta Next.js sozinha: **não mude** build command nem output directory.

Não clique em Deploy ainda — preencha as variáveis primeiro, senão o primeiro
build sobe sem elas e a tela de configuração pendente é o que a equipe vai ver.

## 3. Variáveis de ambiente

Em **Settings → Environment Variables**, para **Production** e **Preview**:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | a mesma do `.env.local` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | a mesma do `.env.local` |
| `SUPABASE_SECRET_KEY` | a mesma do `.env.local` |
| `NEXT_PUBLIC_SITE_URL` | `https://seu-projeto.vercel.app` — **sem barra no fim** |

**`NEXT_PUBLIC_SITE_URL` é o que mais quebra.** É ela que monta o link dos
convites. Apontando para `localhost`, o convite chega com um link que só funciona
na sua máquina — e a pessoa convidada não tem como saber disso.

> A `SUPABASE_SECRET_KEY` fica marcada como sensível pela Vercel e não aparece
> mais depois de salva. Ela ignora todo o RLS; se algum dia vazar, gere outra em
> **Project Settings → API Keys** no Supabase e troque aqui.

## 4. Liberar a URL no Supabase

Sem isso o login funciona mas o convite continua caindo no lugar errado.

Em **Authentication → URL Configuration**:

- **Site URL:** `https://seu-projeto.vercel.app`
- **Redirect URLs:** mantenha as de `localhost` e **acrescente**:

```
https://seu-projeto.vercel.app/auth/entrada
https://seu-projeto.vercel.app/auth/confirm
https://*-seu-time.vercel.app/auth/entrada
```

A terceira linha cobre as URLs de preview que a Vercel gera a cada branch. Sem
ela, testar autenticação numa preview não funciona.

> Manter as de `localhost` é de propósito: você continua desenvolvendo na sua
> máquina contra o mesmo banco.

## 5. Deploy

Clique em **Deploy**. O primeiro build leva uns dois minutos.

Depois dele, todo `git push` na `main` publica sozinho, e toda branch ganha uma
URL de preview própria.

## 6. Conferir

Nesta ordem, porque cada item depende do anterior:

1. Abra a URL. Deve cair no **login** — não na tela de configuração pendente. Se
   cair nela, falta variável de ambiente no passo 3.
2. Entre com sua conta. Deve abrir a tela **Hoje**.
3. **Equipe → Convidar membro** com um e-mail seu alternativo. O link do e-mail
   tem que apontar para o domínio da Vercel, não para `localhost`.
4. Aceite o convite numa janela anônima e defina a senha.

---

## Domínio próprio (opcional)

Em **Settings → Domains** na Vercel, adicione `steera.seudominio.com.br` e
publique o `CNAME` que ela indicar.

Fazendo isso, **volte ao passo 3 e ao 4**: `NEXT_PUBLIC_SITE_URL` e as Redirect
URLs precisam apontar para o domínio novo. Esquecer disso é o jeito mais comum de
o convite parar de funcionar depois de tudo estar no ar.

---

## Mudanças de banco depois do deploy

A Vercel publica o código; o banco continua sendo o mesmo Supabase, e migrations
**não** sobem no deploy. O fluxo segue igual ao do desenvolvimento:

```bash
npm run db:push
```

Rode **antes** do `git push` quando a mudança de código depender do schema novo —
senão a versão publicada procura uma coluna que ainda não existe.

---

## Checklist

- [ ] `git push` com a `main` em dia
- [ ] Projeto importado na Vercel, sem mexer em build settings
- [ ] Quatro variáveis em Production e Preview
- [ ] `NEXT_PUBLIC_SITE_URL` com o domínio real e sem barra no fim
- [ ] Site URL e Redirect URLs do Supabase com a URL da Vercel
- [ ] Login testado na URL publicada
- [ ] Convite testado de ponta a ponta, em janela anônima
