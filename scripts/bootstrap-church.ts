/**
 * Cria a primeira igreja e seu administrador, usando a service role key.
 *
 * Este script roda FORA do runtime público da aplicação — nunca é exposto
 * como rota HTTP. É a única forma prevista de criar uma igreja neste MVP
 * (não há cadastro público). Rode-o localmente ou em um ambiente de
 * confiança (ex.: sua máquina, um job de CI protegido), nunca a partir do
 * navegador.
 *
 * Uso:
 *   npm run bootstrap:church -- \
 *     --nome "Igreja Modelo" \
 *     --slug igreja-modelo \
 *     --fuso America/Sao_Paulo \
 *     --admin-email pastor@example.com \
 *     --admin-nome "Nome do Administrador" \
 *     --admin-senha "UmaSenhaForte123!"
 *
 * Requer, no .env.local (ou variáveis de ambiente do processo):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

loadEnv({ path: ".env.local" });

// @supabase/supabase-js exige um construtor global WebSocket (nativo a partir
// do Node 22) mesmo quando o script não usa recursos em tempo real. Em Node
// 20/21, fazemos o polyfill com o pacote `ws` para este script continuar
// funcionando sem exigir a versão mais nova do Node.
if (!("WebSocket" in globalThis)) {
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = WebSocket;
}

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token?.startsWith("--")) {
      const key = token.slice(2);
      const value = argv[i + 1];
      if (value && !value.startsWith("--")) {
        args[key] = value;
        i++;
      } else {
        args[key] = "true";
      }
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();

  const name = args["nome"];
  const slug = args["slug"];
  const timezone = args["fuso"] ?? "America/Sao_Paulo";
  const adminEmail = args["admin-email"];
  const adminName = args["admin-nome"] ?? adminEmail?.split("@")[0] ?? "Administrador";
  const adminPassword = args["admin-senha"];

  if (!name || !slug || !adminEmail || !adminPassword) {
    console.error(
      "Uso: npm run bootstrap:church -- --nome \"Igreja Modelo\" --slug igreja-modelo --admin-email admin@exemplo.com --admin-senha \"SenhaForte123!\" [--admin-nome \"Nome\"] [--fuso America/Sao_Paulo]"
    );
    process.exit(1);
  }

  if (adminPassword.length < 8) {
    console.error("A senha do administrador precisa ter pelo menos 8 caracteres.");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (em .env.local ou no ambiente).");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  console.log(`Criando a igreja "${name}" (${slug})...`);
  const { data: church, error: churchError } = await supabase
    .from("churches")
    .insert({ name, slug, timezone })
    .select()
    .single();

  if (churchError || !church) {
    console.error("Não foi possível criar a igreja:", churchError?.message);
    process.exit(1);
  }

  console.log(`Criando o administrador ${adminEmail}...`);
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: adminName },
  });

  if (userError || !userData.user) {
    console.error("Não foi possível criar o usuário administrador:", userError?.message);
    console.error("A igreja já foi criada; você pode reexecutar apenas a criação do membro manualmente, se necessário.");
    process.exit(1);
  }

  const { error: membershipError } = await supabase
    .from("memberships")
    .insert({ church_id: church.id, user_id: userData.user.id, role: "admin" });

  if (membershipError) {
    console.error("Não foi possível vincular o administrador à igreja:", membershipError.message);
    process.exit(1);
  }

  console.log("\nPronto! Igreja e administrador criados com sucesso.");
  console.log(`  Igreja: ${church.name} (/app/${church.slug})`);
  console.log(`  Administrador: ${adminEmail}`);
  console.log("\nPeça para o administrador entrar em /entrar com o e-mail e a senha definidos.");
  console.log("Recomendado: peça para ele trocar a senha após o primeiro acesso.");
}

main().catch((error) => {
  console.error("Erro inesperado:", error);
  process.exit(1);
});
