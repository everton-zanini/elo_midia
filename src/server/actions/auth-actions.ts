"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, toUserMessage, type ActionResult } from "@/server/action-result";

const signInSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

export async function signIn(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return fail("Verifique os dados informados.", { email: parsed.error.issues[0]?.message ?? "" });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.message.toLowerCase().includes("invalid login credentials")) {
      return fail("E-mail ou senha incorretos.");
    }
    return fail(toUserMessage(error));
  }

  const proximo = formData.get("proximo");
  redirect(typeof proximo === "string" && proximo.startsWith("/") ? proximo : "/app");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}

const resetPasswordSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
});

export async function requestPasswordReset(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "E-mail inválido.");
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/redefinir-senha`,
  });

  // Nunca revelamos se o e-mail existe ou não: sempre respondemos com sucesso.
  if (error) {
    return fail("Não foi possível enviar o e-mail agora. Tente novamente em instantes.");
  }
  return ok(undefined);
}

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export async function updatePassword(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(toUserMessage(error));
  return ok(undefined);
}
