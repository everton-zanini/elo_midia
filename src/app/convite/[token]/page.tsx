import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getInvitePreview } from "@/server/actions/invite-actions";
import { createClient } from "@/lib/supabase/server";
import { InviteClient } from "./invite-client";

export const metadata: Metadata = { title: "Convite" };

const STATUS_MESSAGES: Record<string, string> = {
  expired: "Este convite expirou. Peça para um administrador da igreja enviar um novo.",
  revoked: "Este convite foi revogado.",
  accepted: "Este convite já foi utilizado.",
  not_found: "Convite não encontrado. Verifique se o link foi copiado corretamente.",
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const preview = await getInvitePreview(token);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-10">
      <Logo iconClassName="h-10 w-10" className="text-2xl" />
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="mb-4 font-heading text-xl font-bold">Convite para o Elo Mídia</h1>
        {preview.status === "valid" && preview.churchName && preview.email && preview.role ? (
          <InviteClient
            token={token}
            churchName={preview.churchName}
            email={preview.email}
            role={preview.role as "admin" | "coordinator" | "collaborator"}
            isAuthenticated={!!user}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {STATUS_MESSAGES[preview.status] ?? "Não foi possível carregar este convite."}
            </p>
            <Link href="/entrar" className="text-sm font-medium text-primary hover:underline">
              Ir para o login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
