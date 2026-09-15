"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/server/actions/auth-actions";
import { useReportPending } from "@/hooks/use-report-pending";

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePassword, null);
  const router = useRouter();
  useReportPending(isPending, "Salvando…");

  useEffect(() => {
    if (state?.ok) {
      const timer = setTimeout(() => router.push("/app"), 1500);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  if (state?.ok) {
    return <p className="text-sm">Senha atualizada! Redirecionando…</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Nova senha</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required autoFocus minLength={8} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirme a nova senha</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
