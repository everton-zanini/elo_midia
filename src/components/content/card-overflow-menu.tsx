"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { MoreVertical, Copy, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { duplicateContent, setContentArchived } from "@/server/actions/content-actions";
import { isManager } from "@/lib/workflow";
import type { MembershipRole } from "@/lib/supabase/types";

export function CardOverflowMenu({
  churchSlug,
  contentId,
  archived,
  canDuplicate,
  role,
}: {
  churchSlug: string;
  contentId: string;
  archived: boolean;
  canDuplicate: boolean;
  role: MembershipRole;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const canArchive = isManager(role);

  if (!canDuplicate && !canArchive) return null;

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateContent(churchSlug, contentId);
      if (result.ok) router.push(`/app/${churchSlug}/producao/${result.data.id}`);
    });
  }

  function handleArchiveToggle() {
    startTransition(async () => {
      await setContentArchived(churchSlug, contentId, !archived);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Mais ações" disabled={isPending}>
            <MoreVertical className="h-4 w-4" aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {canDuplicate ? (
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="h-4 w-4" aria-hidden="true" />
            Duplicar
          </DropdownMenuItem>
        ) : null}
        {canArchive ? (
          <DropdownMenuItem onClick={handleArchiveToggle}>
            {archived ? (
              <>
                <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
                Restaurar
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" aria-hidden="true" />
                Arquivar
              </>
            )}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
