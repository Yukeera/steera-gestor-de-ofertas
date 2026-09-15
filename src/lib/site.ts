/**
 * De onde o app se considera servido.
 *
 * Usado para montar links que saem do sistema — hoje o do convite por e-mail.
 * Errar aqui produz um link que abre na máquina de quem publicou e em mais
 * nenhuma, e quem recebe não tem como saber disso.
 *
 * A ordem existe para que o caso comum funcione sem configuração:
 *
 *  1. `NEXT_PUBLIC_SITE_URL` — o que você declarou. Ganha de tudo, e é o
 *     único jeito de apontar para um domínio próprio.
 *  2. `VERCEL_PROJECT_PRODUCTION_URL` — o domínio estável do projeto, injetado
 *     pela Vercel. Não muda a cada deploy.
 *  3. `VERCEL_URL` — a URL daquele deploy específico. É o que salva as
 *     previews de branch, onde o domínio muda a cada push.
 *  4. localhost, para desenvolvimento.
 */
export function urlDoSite(): string {
  const declarada = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (declarada) return declarada.replace(/\/+$/, "");

  const producao = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (producao) return `https://${producao}`;

  const deploy = process.env.VERCEL_URL;
  if (deploy) return `https://${deploy}`;

  return "http://localhost:3000";
}
