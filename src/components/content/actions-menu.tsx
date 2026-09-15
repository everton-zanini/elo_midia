"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimeLocalField } from "@/components/ui/datetime-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServerAction } from "@/hooks/use-server-action";
import {
  ACTION_LABELS,
  getAvailableActions,
  type WorkflowActionId,
  type WorkflowActor,
  type WorkflowContentSnapshot,
} from "@/lib/workflow";
import {
  approveContent,
  confirmPublication,
  reopenContent,
  requestChanges,
  scheduleContent,
  sendToApproval,
  sendToCreation,
  sendToPlanning,
} from "@/server/actions/content-actions";

interface Member {
  userId: string;
  fullName: string;
}

export function ContentActionsMenu({
  churchSlug,
  content,
  actor,
  hasActiveApproval,
  hasChannel,
  members,
  timezone,
  mode = "menu",
}: {
  churchSlug: string;
  content: WorkflowContentSnapshot & { version: number };
  actor: WorkflowActor;
  hasActiveApproval: boolean;
  hasChannel: boolean;
  members: Member[];
  timezone: string;
  mode?: "menu" | "buttons";
}) {
  const [openAction, setOpenAction] = useState<WorkflowActionId | null>(null);
  const actions = getAvailableActions(content, actor, hasActiveApproval);

  if (actions.length === 0) return null;

  const needsDialog: Partial<Record<WorkflowActionId, boolean>> = {
    enviar_para_criacao: true,
    solicitar_alteracoes: true,
    agendar: true,
    confirmar_publicacao: true,
    reabrir: true,
  };

  function handleSelect(action: WorkflowActionId) {
    if (needsDialog[action]) {
      // Adia a abertura para depois do menu terminar de fechar — abrir no
      // mesmo tick faz o clique de fechamento do menu ser lido como um
      // "clique fora" do diálogo, fechando-o imediatamente.
      setTimeout(() => setOpenAction(action), 200);
    } else {
      void runSimpleAction(action);
    }
  }

  async function runSimpleAction(action: WorkflowActionId) {
    const formData = new FormData();
    formData.set("content_id", content.id);
    formData.set("version", String(content.version));
    if (action === "enviar_para_planejamento") await sendToPlanning(churchSlug, formData);
    if (action === "enviar_para_aprovacao") await sendToApproval(churchSlug, formData);
    if (action === "aprovar") await approveContent(churchSlug, content.id, content.version);
  }

  return (
    <>
      {mode === "menu" ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                Mover
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {actions.map((action) => (
              <DropdownMenuItem key={action} onClick={() => handleSelect(action)}>
                {ACTION_LABELS[action]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex flex-wrap gap-2">
          {actions.map((action, index) => (
            <Button key={action} variant={index === 0 ? "default" : "outline"} onClick={() => handleSelect(action)}>
              {ACTION_LABELS[action]}
            </Button>
          ))}
        </div>
      )}

      <SendToCreationDialog
        open={openAction === "enviar_para_criacao"}
        onOpenChange={(open) => !open && setOpenAction(null)}
        churchSlug={churchSlug}
        contentId={content.id}
        version={content.version}
        members={members}
        timezone={timezone}
      />
      <RequestChangesDialog
        open={openAction === "solicitar_alteracoes"}
        onOpenChange={(open) => !open && setOpenAction(null)}
        churchSlug={churchSlug}
        contentId={content.id}
        version={content.version}
      />
      <ScheduleDialog
        open={openAction === "agendar"}
        onOpenChange={(open) => !open && setOpenAction(null)}
        churchSlug={churchSlug}
        contentId={content.id}
        version={content.version}
        hasChannel={hasChannel}
        timezone={timezone}
      />
      <ConfirmPublicationDialog
        open={openAction === "confirmar_publicacao"}
        onOpenChange={(open) => !open && setOpenAction(null)}
        churchSlug={churchSlug}
        contentId={content.id}
        version={content.version}
      />
      <ReopenDialog
        open={openAction === "reabrir"}
        onOpenChange={(open) => !open && setOpenAction(null)}
        churchSlug={churchSlug}
        contentId={content.id}
        version={content.version}
      />
    </>
  );
}

function SendToCreationDialog({
  open,
  onOpenChange,
  churchSlug,
  contentId,
  version,
  members,
  timezone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churchSlug: string;
  contentId: string;
  version: number;
  members: Member[];
  timezone: string;
}) {
  const { state, isPending, run, reset } = useServerAction((fd) => sendToCreation(churchSlug, fd));
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false);
      reset();
      router.refresh();
    }
  }, [state, onOpenChange, reset, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar para criação</DialogTitle>
          <DialogDescription>Defina o responsável principal e o prazo de produção.</DialogDescription>
        </DialogHeader>
        <form action={run} className="flex flex-col gap-4">
          <input type="hidden" name="content_id" value={contentId} />
          <input type="hidden" name="version" value={version} />
          <input type="hidden" name="assignee_id" value={assigneeId ?? ""} />
          <div className="flex flex-col gap-1.5">
            <Label>Responsável principal</Label>
            <Select
              items={Object.fromEntries(members.map((m) => [m.userId, m.fullName]))}
              value={assigneeId}
              onValueChange={setAssigneeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um responsável" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DateTimeLocalField id="production_due_at" name="production_due_at" label="Prazo de produção" timezone={timezone} required />
          {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending || !assigneeId}>
              {isPending ? "Enviando…" : "Enviar para criação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RequestChangesDialog({
  open,
  onOpenChange,
  churchSlug,
  contentId,
  version,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churchSlug: string;
  contentId: string;
  version: number;
}) {
  const { state, isPending, run, reset } = useServerAction((fd) => requestChanges(churchSlug, fd));
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false);
      reset();
      router.refresh();
    }
  }, [state, onOpenChange, reset, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar alterações</DialogTitle>
          <DialogDescription>O conteúdo volta para Criação com o seu comentário.</DialogDescription>
        </DialogHeader>
        <form action={run} className="flex flex-col gap-4">
          <input type="hidden" name="content_id" value={contentId} />
          <input type="hidden" name="version" value={version} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="comment">O que precisa mudar?</Label>
            <Textarea id="comment" name="comment" required rows={4} autoFocus />
          </div>
          {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enviando…" : "Solicitar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleDialog({
  open,
  onOpenChange,
  churchSlug,
  contentId,
  version,
  hasChannel,
  timezone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churchSlug: string;
  contentId: string;
  version: number;
  hasChannel: boolean;
  timezone: string;
}) {
  const { state, isPending, run, reset } = useServerAction((fd) => scheduleContent(churchSlug, fd));
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false);
      reset();
      router.refresh();
    }
  }, [state, onOpenChange, reset, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar publicação</DialogTitle>
          <DialogDescription>Defina a data e o horário planejados de publicação.</DialogDescription>
        </DialogHeader>
        {!hasChannel ? (
          <p className="text-sm text-warning-foreground">
            Este conteúdo ainda não tem um canal selecionado. Volte aos detalhes do conteúdo e escolha ao menos um
            canal antes de agendar.
          </p>
        ) : (
          <form action={run} className="flex flex-col gap-4">
            <input type="hidden" name="content_id" value={contentId} />
            <input type="hidden" name="version" value={version} />
            <DateTimeLocalField
              id="planned_publish_at"
              name="planned_publish_at"
              label="Data e horário de publicação"
              timezone={timezone}
              required
              autoFocus
            />
            {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Agendando…" : "Agendar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmPublicationDialog({
  open,
  onOpenChange,
  churchSlug,
  contentId,
  version,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churchSlug: string;
  contentId: string;
  version: number;
}) {
  const { state, isPending, run, reset } = useServerAction((fd) => confirmPublication(churchSlug, fd));
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false);
      reset();
      router.refresh();
    }
  }, [state, onOpenChange, reset, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar publicação</DialogTitle>
          <DialogDescription>Registre que este conteúdo foi publicado de fato.</DialogDescription>
        </DialogHeader>
        <form action={run} className="flex flex-col gap-4">
          <input type="hidden" name="content_id" value={contentId} />
          <input type="hidden" name="version" value={version} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="published_url">Link da publicação (opcional)</Label>
            <Input id="published_url" name="published_url" type="url" placeholder="https://…" />
          </div>
          {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Confirmando…" : "Confirmar publicação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReopenDialog({
  open,
  onOpenChange,
  churchSlug,
  contentId,
  version,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churchSlug: string;
  contentId: string;
  version: number;
}) {
  const { state, isPending, run, reset } = useServerAction((fd) => reopenContent(churchSlug, fd));
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false);
      reset();
      router.refresh();
    }
  }, [state, onOpenChange, reset, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reabrir conteúdo publicado</DialogTitle>
          <DialogDescription>Explique por que este conteúdo precisa ser corrigido.</DialogDescription>
        </DialogHeader>
        <form action={run} className="flex flex-col gap-4">
          <input type="hidden" name="content_id" value={contentId} />
          <input type="hidden" name="version" value={version} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">Justificativa</Label>
            <Textarea id="reason" name="reason" required rows={3} autoFocus />
          </div>
          {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending} variant="destructive">
              {isPending ? "Reabrindo…" : "Reabrir conteúdo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
