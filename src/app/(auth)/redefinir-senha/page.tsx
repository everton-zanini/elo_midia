import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Redefinir senha" };

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-bold">Defina sua nova senha</h1>
        <p className="text-sm text-muted-foreground">Escolha uma senha com pelo menos 8 caracteres.</p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
