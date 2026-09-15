"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServerAction } from "@/hooks/use-server-action";
import { updateContentInfo } from "@/server/actions/content-actions";
import { CONTENT_TYPE_LABELS, PRIORITY_LABELS } from "@/lib/workflow";
import { ContentTypeBadge } from "@/components/content/badges";
import type { ContentDetail } from "@/server/data/contents";

export function ContentDetailsForm({
  churchSlug,
  content,
  ministries,
  readOnly,
}: {
  churchSlug: string;
  content: ContentDetail;
  ministries: { id: string; name: string }[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const { state, isPending, run } = useServerAction((fd) => updateContentInfo(churchSlug, fd));

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  if (readOnly) {
    return (
      <section className="flex flex-col gap-3 text-sm">
        <h3 className="font-heading text-sm font-semibold">Detalhes</h3>
        <ContentTypeBadge type={content.content_type} className="self-start" />
        <p className="whitespace-pre-wrap">{content.description || "Sem briefing."}</p>
        {content.reference_links.length > 0 ? (
          <ul className="list-inside list-disc text-primary">
            {content.reference_links.map((l) => (
              <li key={l}>
                <a href={l} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {l}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <h3 className="font-heading text-sm font-semibold">Detalhes</h3>
      <form action={run} className="flex flex-col gap-4">
        <input type="hidden" name="content_id" value={content.id} />
        <input type="hidden" name="version" value={content.version} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Título</Label>
          <Input id="title" name="title" defaultValue={content.title} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Briefing ou descrição</Label>
          <Textarea id="description" name="description" defaultValue={content.description} rows={4} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="content_type">Tipo</Label>
            <Select items={CONTENT_TYPE_LABELS} name="content_type" defaultValue={content.content_type}>
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ministry_id">Ministério</Label>
            <Select
              items={{ none: "Nenhum", ...Object.fromEntries(ministries.map((m) => [m.id, m.name])) }}
              name="ministry_id"
              defaultValue={content.ministry?.id ?? "none"}
            >
              <SelectTrigger id="ministry_id">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
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
            <Select items={PRIORITY_LABELS} name="priority" defaultValue={content.priority}>
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reference_links">Links de referência (um por linha)</Label>
          <Textarea
            id="reference_links"
            name="reference_links"
            defaultValue={content.reference_links.join("\n")}
            rows={2}
            placeholder="https://…"
          />
        </div>
        {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
        <Button type="submit" size="sm" className="self-start" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar detalhes"}
        </Button>
      </form>
    </section>
  );
}
