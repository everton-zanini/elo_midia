"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import { createMinistry, setMinistryArchived, updateMinistry } from "@/server/actions/ministry-actions";
import type { Ministry } from "@/lib/supabase/types";

export function MinistriesSection({ churchSlug, ministries }: { churchSlug: string; ministries: Ministry[] }) {
  const router = useRouter();
  const { state, isPending, run, reset } = useServerAction((fd) => createMinistry(churchSlug, fd));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isToggling, startTransition] = useTransition();

  function handleCreate(formData: FormData) {
    run(formData);
    reset();
  }

  function handleToggleArchive(ministry: Ministry) {
    startTransition(async () => {
      await setMinistryArchived(churchSlug, ministry.id, !ministry.archived_at);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-base font-semibold">Ministérios</h2>
      <ul className="flex flex-col gap-1.5">
        {ministries.map((ministry) =>
          editingId === ministry.id ? (
            <EditMinistryRow
              key={ministry.id}
              churchSlug={churchSlug}
              ministry={ministry}
              onDone={() => {
                setEditingId(null);
                router.refresh();
              }}
            />
          ) : (
            <li key={ministry.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <span className="flex-1">{ministry.name}</span>
              {ministry.archived_at ? <span className="text-xs text-muted-foreground">Arquivado</span> : null}
              <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => setEditingId(ministry.id)}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={ministry.archived_at ? "Restaurar" : "Arquivar"}
                disabled={isToggling}
                onClick={() => handleToggleArchive(ministry)}
              >
                {ministry.archived_at ? (
                  <ArchiveRestore className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </Button>
            </li>
          )
        )}
      </ul>

      <form action={handleCreate} className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <Input name="name" required placeholder="Nome do novo ministério" />
        </div>
        <Button type="submit" size="sm" disabled={isPending}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Adicionar
        </Button>
      </form>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
    </section>
  );
}

function EditMinistryRow({
  churchSlug,
  ministry,
  onDone,
}: {
  churchSlug: string;
  ministry: Ministry;
  onDone: () => void;
}) {
  const { state, isPending, run } = useServerAction((fd) => updateMinistry(churchSlug, fd));

  if (state?.ok) onDone();

  return (
    <li>
      <form action={run} className="flex items-center gap-2">
        <input type="hidden" name="id" value={ministry.id} />
        <Input name="name" defaultValue={ministry.name} required autoFocus className="flex-1" />
        <Button type="submit" size="sm" disabled={isPending}>
          Salvar
        </Button>
        {state && !state.ok ? <p className="text-xs text-destructive">{state.message}</p> : null}
      </form>
    </li>
  );
}
