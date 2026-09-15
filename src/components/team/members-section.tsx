"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getInitials } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";
import { wouldRemoveLastAdmin } from "@/lib/workflow";
import { contentsNeedingNewAssignee, removeMember, updateMemberRole } from "@/server/actions/membership-actions";
import type { MembershipRole } from "@/lib/supabase/types";
import type { TeamMember } from "@/server/data/team";
import { toast } from "sonner";
import { useReportPending } from "@/hooks/use-report-pending";

export function MembersSection({
  churchSlug,
  members,
  canManage,
  currentUserId,
}: {
  churchSlug: string;
  members: TeamMember[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [pendingContents, setPendingContents] = useState<{ id: string; title: string }[]>([]);
  const [isPending, startTransition] = useTransition();
  useReportPending(isPending);

  const membershipSummaries = members.map((m) => ({ userId: m.userId, role: m.role }));

  function handleRoleChange(member: TeamMember, role: string) {
    if (wouldRemoveLastAdmin(membershipSummaries, member.userId, role as MembershipRole)) {
      toast.error("Isso deixaria a igreja sem administrador.");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("user_id", member.userId);
      formData.set("role", role);
      const result = await updateMemberRole(churchSlug, formData);
      if (!result.ok) toast.error(result.message);
      else router.refresh();
    });
  }

  async function openRemoveDialog(member: TeamMember) {
    if (wouldRemoveLastAdmin(membershipSummaries, member.userId, "remove")) {
      toast.error("Isso deixaria a igreja sem administrador.");
      return;
    }
    const contents = await contentsNeedingNewAssignee(churchSlug, member.userId);
    setPendingContents(contents.map((c) => ({ id: c.id, title: c.title })));
    setRemoveTarget(member);
  }

  function confirmRemove() {
    if (!removeTarget) return;
    startTransition(async () => {
      const result = await removeMember(churchSlug, removeTarget.userId);
      if (!result.ok) toast.error(result.message);
      setRemoveTarget(null);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-heading text-base font-semibold">Membros</h2>
      <div className="flex flex-col gap-2">
        {members.map((member) => (
          <div key={member.userId} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{getInitials(member.fullName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {member.fullName} {member.userId === currentUserId ? <span className="text-muted-foreground">(você)</span> : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">{member.email}</p>
            </div>
            {canManage ? (
              <Select
                items={ROLE_LABELS}
                value={member.role}
                onValueChange={(v) => v && handleRoleChange(member, v)}
                disabled={isPending}
              >
                <SelectTrigger className="w-[150px]">
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
            ) : (
              <span className="text-sm text-muted-foreground">{ROLE_LABELS[member.role]}</span>
            )}
            {canManage ? (
              <Button variant="ghost" size="icon-sm" aria-label="Remover membro" onClick={() => openRemoveDialog(member)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {removeTarget?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              O nome dele permanece no histórico dos conteúdos. Esta ação não pode ser desfeita.
              {pendingContents.length > 0 ? (
                <span className="mt-2 block font-medium text-warning-foreground">
                  {pendingContents.length} conteúdo(s) sob responsabilidade dele precisarão de um novo responsável:{" "}
                  {pendingContents.map((c) => c.title).join(", ")}
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} disabled={isPending}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
