"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimeLocalField } from "@/components/ui/datetime-field";
import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from "@/server/actions/checklist-actions";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChecklistItemView } from "@/server/data/content-related";

export function ChecklistSection({
  churchSlug,
  contentId,
  items,
  members,
  timezone,
  canManage,
  currentUserId,
}: {
  churchSlug: string;
  contentId: string;
  items: ChecklistItemView[];
  members: { userId: string; fullName: string }[];
  timezone: string;
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const { state, isPending, run, reset } = useServerAction((fd) => addChecklistItem(churchSlug, fd));

  function handleAdd(formData: FormData) {
    run(formData);
    reset();
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-heading text-sm font-semibold">Checklist</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma tarefa ainda.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <ChecklistRow
              key={item.id}
              item={item}
              churchSlug={churchSlug}
              contentId={contentId}
              timezone={timezone}
              canToggle={canManage || item.assignee?.id === currentUserId}
              canDelete={canManage}
              onChanged={() => router.refresh()}
            />
          ))}
        </ul>
      )}

      {canManage ? (
        <form action={handleAdd} className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
          <input type="hidden" name="content_id" value={contentId} />
          <input type="hidden" name="assignee_id" value={assigneeId ?? ""} />
          <div className="flex min-w-[180px] flex-1 flex-col gap-1">
            <label htmlFor="checklist-title" className="text-xs text-muted-foreground">
              Nova tarefa
            </label>
            <Input id="checklist-title" name="title" required placeholder="Descreva a tarefa" />
          </div>
          <div className="flex w-40 flex-col gap-1">
            <span className="text-xs text-muted-foreground">Responsável (opcional)</span>
            <Select
              items={{ none: "Ninguém", ...Object.fromEntries(members.map((m) => [m.userId, m.fullName])) }}
              value={assigneeId ?? "none"}
              onValueChange={(v) => setAssigneeId(v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ninguém" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguém</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <DateTimeLocalField id="checklist-due" name="due_at" label="Prazo (opcional)" timezone={timezone} />
          </div>
          <Button type="submit" size="sm" disabled={isPending}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar
          </Button>
          {state && !state.ok ? <p className="w-full text-sm text-destructive">{state.message}</p> : null}
        </form>
      ) : null}
    </section>
  );
}

function ChecklistRow({
  item,
  churchSlug,
  contentId,
  timezone,
  canToggle,
  canDelete,
  onChanged,
}: {
  item: ChecklistItemView;
  churchSlug: string;
  contentId: string;
  timezone: string;
  canToggle: boolean;
  canDelete: boolean;
  onChanged: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      await toggleChecklistItem(churchSlug, contentId, item.id, checked);
      onChanged();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteChecklistItem(churchSlug, contentId, item.id);
      onChanged();
    });
  }

  return (
    <li className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
      <Checkbox
        checked={item.done}
        disabled={!canToggle || isPending}
        onCheckedChange={(checked) => handleToggle(checked === true)}
        aria-label={`Marcar "${item.title}" como concluída`}
      />
      <span className={cn("flex-1 text-sm", item.done && "text-muted-foreground line-through")}>{item.title}</span>
      {item.assignee ? <span className="text-xs text-muted-foreground">{item.assignee.full_name}</span> : null}
      {item.due_at ? <span className="text-xs text-muted-foreground">{formatDate(item.due_at, timezone)}</span> : null}
      {canDelete ? (
        <Button variant="ghost" size="icon-sm" aria-label="Remover tarefa" disabled={isPending} onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      ) : null}
    </li>
  );
}
