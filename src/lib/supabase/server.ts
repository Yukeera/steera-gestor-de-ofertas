import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { envPublico, envServidor } from "@/lib/env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Usa a chave anon, então continua sujeito ao RLS — que é o ponto.
 */
export async function criarClienteServidor() {
  const cookieStore = await cookies();
  const env = envPublico();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component não pode escrever cookie. O middleware já
            // renova a sessão a cada request, então ignorar aqui é seguro.
          }
        },
      },
    },
  );
}

/**
 * Cliente administrativo: **ignora todo o RLS**.
 *
 * Só existe para o que a API pública não consegue fazer — hoje, convidar um
 * membro (criar o usuário em auth.users). Nunca importe isto em código que
 * roda no navegador, e nunca use para uma leitura que o cliente normal
 * conseguiria fazer: o RLS é a barreira de verdade do sistema.
 */
export function criarClienteAdmin() {
  const { SUPABASE_SERVICE_ROLE_KEY } = envServidor();
  const env = envPublico();

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
