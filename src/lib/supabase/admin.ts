import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cliente com a service role key: ignora RLS por completo.
 *
 * Uso estritamente limitado a scripts administrativos executados fora do
 * runtime público da aplicação (ex.: scripts/bootstrap-church.ts). Nunca
 * importe este módulo em uma rota, Server Action ou componente que atenda
 * requisições de usuários finais.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_URL são obrigatórios para operações administrativas."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
