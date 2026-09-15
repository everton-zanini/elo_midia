"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useServerAction } from "@/hooks/use-server-action";
import { updatePlannedPublishAt } from "@/server/actions/content-actions";
import { DateTimeLocalField } from "@/components/ui/datetime-field";

export function RescheduleControl({
  churchSlug,
  contentId,
  version,
  plannedPublishAt,
  timezone,
}: {
  churchSlug: string;
  contentId: string;
  version: number;
  plannedPublishAt: string | null;
  timezone: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { state, isPending, run } = useServerAction((fd) => updatePlannedPublishAt(churchSlug, fd));

  if (state?.ok && open) {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="ghost" size="icon-sm" aria-label="Alterar data planejada" onClick={() => setOpen(true)}>
        <CalendarClock className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar data planejada</DialogTitle>
            <DialogDescription>Isso não invalida uma aprovação existente, mas fica registrado no histórico.</DialogDescription>
          </DialogHeader>
          <form action={run} className="flex flex-col gap-4">
            <input type="hidden" name="content_id" value={contentId} />
            <input type="hidden" name="version" value={version} />
            <DateTimeLocalField
              id="planned_publish_at"
              name="planned_publish_at"
              label="Data e horário"
              timezone={timezone}
              defaultValueIso={plannedPublishAt}
              required
              autoFocus
            />
            {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
