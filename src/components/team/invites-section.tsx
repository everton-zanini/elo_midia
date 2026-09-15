"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createInvite, revokeInvite } from "@/server/actions/invite-actions";
import { useServerAction } from "@/hooks/use-server-action";
import { ROLE_LABELS } from "@/lib/roles";
import { formatDateTime } from "@/lib/format";
import type { MembershipRole } from "@/lib/supabase/types";
import type { Invite } from "@/lib/supabase/types";
import { toast } from "sonner";

export function InvitesSection({
  churchSlug,
  invites,
  timezone,
}: {
  churchSlug: string;
  invites: Invite[];
  timezone: string;
}) {
  const router = useRouter();
  const { state, isPending, run } = useServerAction((fd) => createInvite(churchSlug, fd));
  const [isRevoking, startRevoke] = useTransition();
  const lastLink = state?.ok ? state.data.link : null;

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  function copyLink(link: string) {
    navigator.clipboard.writeText(link).then(
      () => toast.success("Link copiado."),
      () => toast.error("Não foi possível copiar o link.")
    );
  }

  function handleRevoke(inviteId: string) {
    startRevoke(async () => {
      await revokeInvite(churchSlug, inviteId);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-base font-semibold">Convites</h2>

      <form action={run} className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <Label htmlFor="invite-email">E-mail</Label>
          <Input id="invite-email" name="email" type="email" required placeholder="pessoa@exemplo.com" />
        </div>
        <div className="flex w-40 flex-col gap-1">
          <Label htmlFor="invite-role">Perfil</Label>
          <Select items={ROLE_LABELS} name="role" defaultValue="collaborator">
            <SelectTrigger id="invite-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ROLE_LABELS) as MembershipRole[]).map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Convidando…" : "Convidar"}
        </Button>
        {state && !state.ok ? <p className="w-full text-sm text-destructive">{state.message}</p> : null}
      </form>

      {lastLink ? (
        <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
          <span className="flex-1 truncate">{lastLink}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => copyLink(lastLink)}>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copiar link
          </Button>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        O envio automático de e-mail depende da configuração de SMTP do projeto Supabase (veja o README). Enquanto
        isso, copie e envie o link manualmente.
      </p>

      {invites.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum convite pendente.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {invites.map((invite) => {
            const link = `${typeof window !== "undefined" ? window.location.origin : ""}/convite/${invite.token}`;
            return (
              <li key={invite.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{invite.email}</span>
                <span className="text-xs text-muted-foreground">{ROLE_LABELS[invite.role]}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  expira {formatDateTime(invite.expires_at, timezone)}
                </span>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Copiar link" onClick={() => copyLink(link)}>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Revogar convite"
                  disabled={isRevoking}
                  onClick={() => handleRevoke(invite.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
