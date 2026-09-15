import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Cliente Supabase para uso em Server Components, Server Actions e Route
 * Handlers. Usa a sessão do usuário (cookies) — nunca a service role key —
 * para que toda leitura/escrita passe pelas políticas de RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Chamado a partir de um Server Component sem permissão de escrita
            // em cookies. O proxy.ts cuida de renovar a sessão nesse caso.
          }
        },
      },
    }
  );
}
