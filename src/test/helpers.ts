import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const CHURCH_1 = "11111111-1111-4111-8111-111111111111"; // Igreja Modelo
export const CHURCH_2 = "22222222-2222-4222-8222-222222222222"; // Segunda Igreja

export const USERS = {
  admin: { id: "a1000000-0000-4000-8000-000000000001", email: "admin@demo.elomidia.app" },
  coordinator: { id: "a2000000-0000-4000-8000-000000000002", email: "coordenador@demo.elomidia.app" },
  collaborator: { id: "a3000000-0000-4000-8000-000000000003", email: "colaborador@demo.elomidia.app" },
  admin2: { id: "a4000000-0000-4000-8000-000000000004", email: "admin2@demo.elomidia.app" },
} as const;

export const DEMO_PASSWORD = "DemoSenha123!";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ${name} ausente — rode com src/test/env-setup.ts`);
  return value;
}

export function adminClient(): SupabaseClient<Database> {
  return createClient<Database>(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function signedInClient(email: string, password = DEMO_PASSWORD): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

export function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Cria um usuário auth de teste já confirmado (uso exclusivo dos testes). */
export async function createConfirmedUser(email: string, password = DEMO_PASSWORD) {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user!;
}

export async function deleteUser(userId: string) {
  const admin = adminClient();
  await admin.auth.admin.deleteUser(userId);
}
