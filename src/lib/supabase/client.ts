import { createBrowserClient } from "@supabase/ssr";

import { envPublico } from "@/lib/env";

/** Cliente Supabase para Client Components. Sempre sujeito ao RLS. */
export function criarClienteNavegador() {
  const env = envPublico();

  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
