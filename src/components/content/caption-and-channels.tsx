"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useServerAction } from "@/hooks/use-server-action";
import { updateCaption, setContentChannels } from "@/server/actions/content-actions";
import { CHANNEL_LABELS } from "@/lib/workflow";
import { ChannelBadge } from "@/components/content/badges";
import type { Channel } from "@/lib/supabase/types";
import { toast } from "sonner";

export function CaptionSection({
  churchSlug,
  contentId,
  version,
  caption,
  readOnly,
}: {
  churchSlug: string;
  contentId: string;
  version: number;
  caption: string;
  readOnly: boolean;
}) {
  const router = useRouter();
  const { state, isPending, run } = useServerAction((fd) => updateCaption(churchSlug, fd));

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-heading text-sm font-semibold">Texto ou legenda</h3>
      {readOnly ? (
        <p className="whitespace-pre-wrap rounded-lg bg-secondary px-3 py-2 text-sm">{caption || "Sem legenda."}</p>
      ) : (
        <form action={run} className="flex flex-col gap-2">
          <input type="hidden" name="content_id" value={contentId} />
          <input type="hidden" name="version" value={version} />
          <Textarea name="caption" defaultValue={caption} rows={3} placeholder="Texto que acompanhará a publicação" />
          <p className="text-xs text-muted-foreground">
            Alterar a legenda depois de aprovado devolve o conteúdo para Criação.
          </p>
          {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
          <Button type="submit" size="sm" className="self-start" disabled={isPending}>
            {isPending ? "Salvando…" : "Salvar legenda"}
          </Button>
        </form>
      )}
    </section>
  );
}

const ALL_CHANNELS: Channel[] = ["instagram", "facebook", "youtube", "whatsapp", "site", "outro"];

export function ChannelsSection({
  churchSlug,
  contentId,
  channels,
  readOnly,
}: {
  churchSlug: string;
  contentId: string;
  channels: Channel[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Channel[]>(channels);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsPending(true);
    setError(null);
    const result = await setContentChannels(churchSlug, contentId, selected);
    setIsPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    toast.success("Canais atualizados.");
    router.refresh();
  }

  const changed = JSON.stringify([...selected].sort()) !== JSON.stringify([...channels].sort());

  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-heading text-sm font-semibold">Canais</h3>
      {readOnly ? (
        <div className="flex flex-wrap gap-1.5">
          {channels.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum canal selecionado.</p>
          ) : (
            channels.map((c) => <ChannelBadge key={c} channel={c} />)
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            {ALL_CHANNELS.map((channel) => (
              <label key={channel} className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={selected.includes(channel)}
                  onCheckedChange={(checked) =>
                    setSelected((prev) => (checked === true ? [...prev, channel] : prev.filter((c) => c !== channel)))
                  }
                />
                {CHANNEL_LABELS[channel]}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Alterar os canais depois de aprovado devolve o conteúdo para Criação.
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {changed ? (
            <Button size="sm" className="self-start" disabled={isPending} onClick={handleSave}>
              {isPending ? "Salvando…" : "Salvar canais"}
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}
