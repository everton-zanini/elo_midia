"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/server/actions/auth-actions";
import { useReportPending } from "@/hooks/use-report-pending";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, null);
  useReportPending(isPending, "Enviando…");

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p>
          Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha. Confira também a caixa de
          spam.
        </p>
        <Link href="/entrar" className="font-medium text-primary hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </div>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Enviando…" : "Enviar link de redefinição"}
      </Button>
      <Link href="/entrar" className="text-center text-sm font-medium text-primary hover:underline">
        Voltar para o login
      </Link>
    </form>
  );
}
