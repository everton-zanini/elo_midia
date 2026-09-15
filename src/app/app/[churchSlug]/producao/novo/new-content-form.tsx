"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimeLocalField } from "@/components/ui/datetime-field";
import { useServerAction } from "@/hooks/use-server-action";
import { createContent } from "@/server/actions/content-actions";
import { CONTENT_TYPE_LABELS, PRIORITY_LABELS } from "@/lib/workflow";
import { localInputToUtcIso } from "@/lib/format";

export function NewContentForm({
  churchSlug,
  ministries,
  timezone,
  initialDate,
}: {
  churchSlug: string;
  ministries: { id: string; name: string }[];
  timezone: string;
  initialDate?: string;
}) {
  const router = useRouter();
  const { state, isPending, run } = useServerAction((fd) => createContent(churchSlug, fd));

  useEffect(() => {
    if (state?.ok) {
      router.push(`/app/${churchSlug}/producao/${state.data.id}`);
    }
  }, [state, churchSlug, router]);

  return (
    <form action={run} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Título</Label>
          <Input id="title" name="title" required autoFocus placeholder="Ex.: Post de convite para o culto de jovens" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="content_type">Tipo</Label>
          <Select items={CONTENT_TYPE_LABELS} name="content_type" defaultValue="arte">
            <SelectTrigger id="content_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Briefing ou descrição</Label>
          <Textarea id="description" name="description" rows={4} placeholder="O que precisa ser produzido?" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ministry_id">Ministério ou área solicitante</Label>
            <Select items={Object.fromEntries(ministries.map((m) => [m.id, m.name]))} name="ministry_id">
              <SelectTrigger id="ministry_id">
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                {ministries.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="priority">Prioridade</Label>
            <Select items={PRIORITY_LABELS} name="priority" defaultValue="normal">
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {initialDate ? (
          <DateTimeLocalField
            id="planned_publish_at"
            name="planned_publish_at"
            label="Data planejada de publicação"
            timezone={timezone}
            defaultValueIso={localInputToUtcIso(`${initialDate}T09:00`, timezone)}
          />
        ) : null}
      </section>

      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Criando…" : "Criar solicitação"}
      </Button>
    </form>
  );
}
