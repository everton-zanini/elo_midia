import type { Metadata } from "next";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string }>;
}) {
  const { proximo } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-bold">Entrar</h1>
        <p className="text-sm text-muted-foreground">Acesse com o e-mail e a senha da sua conta.</p>
      </div>
      <SignInForm proximo={proximo && proximo.startsWith("/") ? proximo : "/app"} />
    </div>
  );
}
