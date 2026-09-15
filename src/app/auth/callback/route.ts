import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Troca o código PKCE (de e-mails de recuperação de senha ou de confirmação
 * de cadastro) por uma sessão autenticada, e então segue para o destino
 * pedido (?next=...). Sem essa troca, o usuário chegaria autenticado só no
 * navegador do link, sem sessão de servidor.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/entrar`);
}
