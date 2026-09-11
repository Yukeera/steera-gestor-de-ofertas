import { z } from "zod";

/**
 * Validação das variáveis de ambiente.
 *
 * Deliberadamente preguiçosa: se a validação rodasse no topo do módulo, um
 * `next build` num ambiente sem as chaves (CI, clone novo) falharia antes de
 * compilar qualquer coisa. Validando na chamada, o erro aparece quando alguém
 * de fato tenta falar com o Supabase — e aí dizendo exatamente o que preencher.
 */

const esquemaPublico = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url(
      "NEXT_PUBLIC_SUPABASE_URL precisa ser a URL do projeto Supabase. Veja docs/SETUP.md.",
    ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY não pode ficar vazia."),
});

export type EnvPublico = z.infer<typeof esquemaPublico>;

export function envPublico(): EnvPublico {
  // Precisa ser referência literal a `process.env.X`: o Next substitui essas
  // expressões em build time no bundle do cliente. Acesso dinâmico não funciona.
  return esquemaPublico.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

/**
 * Só no servidor. A service role ignora todo o RLS.
 */
export function envServidor() {
  return z
    .object({
      SUPABASE_SERVICE_ROLE_KEY: z
        .string()
        .min(
          1,
          "SUPABASE_SERVICE_ROLE_KEY é obrigatória para convidar membros. Veja docs/SETUP.md.",
        ),
    })
    .parse({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
}
