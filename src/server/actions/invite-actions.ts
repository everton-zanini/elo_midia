"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireChurchContext, requireRole } from "@/server/church";
import { fail, ok, toUserMessage, type ActionResult } from "@/server/action-result";
import { flattenZodErrors, inviteCreateSchema } from "@/lib/validations";

const INVITE_TTL_DAYS = 7;

export interface InvitePreview {
  churchName: string | null;
  role: string | null;
  email: string | null;
  status: "valid" | "expired" | "revoked" | "accepted" | "not_found";
}

export async function getInvitePreview(token: string): Promise<InvitePreview> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invite_preview", { p_token: token });
  const row = data?.[0];
  if (error || !row) {
    return { churchName: null, role: null, email: null, status: "not_found" };
  }
  return {
    churchName: row.church_name,
    role: row.role,
    email: row.email,
    status: row.status as InvitePreview["status"],
  };
}

export async function createInvite(churchSlug: string, formData: FormData): Promise<ActionResult<{ link: string }>> {
  const { church, membership, supabase } = await requireChurchContext(churchSlug);
  requireRole(membership, ["admin"]);

  const parsed = inviteCreateSchema.safeParse({
    church_id: church.id,
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return fail("Verifique os dados do convite.", flattenZodErrors(parsed.error));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error } = await supabase
    .from("invites")
    .insert({
      church_id: parsed.data.church_id,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      invited_by: user!.id,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error || !invite) return fail(toUserMessage(error));

  revalidatePath(`/app/${churchSlug}/equipe`);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return ok({ link: `${siteUrl}/convite/${invite.token}` });
}

export async function revokeInvite(churchSlug: string, inviteId: string): Promise<ActionResult> {
  const { membership, supabase } = await requireChurchContext(churchSlug);
  requireRole(membership, ["admin"]);

  const { error } = await supabase
    .from("invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId);

  if (error) return fail(toUserMessage(error));
  revalidatePath(`/app/${churchSlug}/equipe`);
  return ok(undefined);
}

const acceptInviteSchema = z.object({ token: z.string().uuid() });

export async function acceptInvite(token: string): Promise<ActionResult<{ churchSlug: string }>> {
  const parsed = acceptInviteSchema.safeParse({ token });
  if (!parsed.success) return fail("Convite inválido.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Entre com sua conta para aceitar o convite.");

  const { error } = await supabase.rpc("accept_invite", { p_token: parsed.data.token });
  if (error) return fail(toUserMessage(error));

  const { data: membership } = await supabase
    .from("memberships")
    .select("churches(slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const slug = (membership?.churches as unknown as { slug: string } | null)?.slug ?? "";
  return ok({ churchSlug: slug });
}

const signUpForInviteSchema = z.object({
  token: z.string().uuid(),
  fullName: z.string().trim().min(2, "Informe seu nome."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

/**
 * Cria a conta do convidado (com o e-mail exato do convite, nunca o que o
 * cliente digitar) e, se já vier com sessão ativa (confirmação de e-mail
 * desligada no projeto), aceita o convite na sequência.
 */
export async function signUpForInvite(
  _prevState: ActionResult<{ churchSlug: string | null; needsEmailConfirmation: boolean }> | null,
  formData: FormData
): Promise<ActionResult<{ churchSlug: string | null; needsEmailConfirmation: boolean }>> {
  const parsed = signUpForInviteSchema.safeParse({
    token: formData.get("token"),
    fullName: formData.get("fullName"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const preview = await getInvitePreview(parsed.data.token);
  if (preview.status !== "valid" || !preview.email) {
    return fail(
      preview.status === "expired"
        ? "Este convite expirou."
        : preview.status === "revoked"
          ? "Este convite foi revogado."
          : preview.status === "accepted"
            ? "Este convite já foi utilizado."
            : "Convite não encontrado."
    );
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email: preview.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteUrl}/auth/callback?next=/convite/${parsed.data.token}`,
    },
  });
  if (error) return fail(toUserMessage(error));

  if (!data.session) {
    return ok({ churchSlug: null, needsEmailConfirmation: true });
  }

  const acceptResult = await acceptInvite(parsed.data.token);
  if (!acceptResult.ok) return fail(acceptResult.message);
  return ok({ churchSlug: acceptResult.data.churchSlug, needsEmailConfirmation: false });
}
