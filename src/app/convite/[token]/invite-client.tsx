"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvite, signUpForInvite } from "@/server/actions/invite-actions";
import { ROLE_LABELS } from "@/lib/roles";
import { useReportPending } from "@/hooks/use-report-pending";

export function InviteClient({
  token,
  churchName,
  role,
  email,
  isAuthenticated,
}: {
  token: string;
  churchName: string;
  role: "admin" | "coordinator" | "collaborator";
  email: string;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [signUpState, signUpAction, isSigningUp] = useActionState(signUpForInvite, null);
  useReportPending(isPending || isSigningUp);

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptInvite(token);
      if (!result.ok) {
        setAcceptError(result.message);
        return;
      }
      router.push(`/app/${result.data.churchSlug}`);
    });
  }

  if (signUpState?.ok) {
    if (signUpState.data.needsEmailConfirmation) {
      return (
        <p className="text-sm">
          Confirme seu e-mail em <strong>{email}</strong> para concluir o cadastro. Depois de confirmar, volte a
          abrir este link de convite.
        </p>
      );
    }
    if (signUpState.data.churchSlug) {
      router.push(`/app/${signUpState.data.churchSlug}`);
    }
    return <p className="text-sm">Conta criada! Entrando na igreja…</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">
        <p>
          Você foi convidado(a) para <strong>{churchName}</strong> como <strong>{ROLE_LABELS[role]}</strong>.
        </p>
        <p className="mt-1 text-muted-foreground">{email}</p>
      </div>

      {isAuthenticated ? (
        <div className="flex flex-col gap-3">
          {acceptError ? <p className="text-sm text-destructive">{acceptError}</p> : null}
          <Button onClick={handleAccept} disabled={isPending}>
            {isPending ? "Aceitando…" : "Aceitar convite"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <form action={signUpAction} className="flex flex-col gap-4" noValidate>
            <input type="hidden" name="token" value={token} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Seu nome</Label>
              <Input id="fullName" name="fullName" required autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Crie uma senha</Label>
              <Input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
            </div>
            {signUpState && !signUpState.ok ? <p className="text-sm text-destructive">{signUpState.message}</p> : null}
            <Button type="submit" disabled={isSigningUp}>
              {isSigningUp ? "Criando conta…" : "Criar conta e aceitar convite"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link href={`/entrar?proximo=/convite/${token}`} className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
