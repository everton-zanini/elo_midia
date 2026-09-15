"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useServerAction } from "@/hooks/use-server-action";
import { addComment } from "@/server/actions/comment-actions";
import { getInitials } from "@/lib/format";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import type { CommentView } from "@/server/data/content-related";

export function CommentsSection({
  churchSlug,
  contentId,
  comments,
  timezone,
}: {
  churchSlug: string;
  contentId: string;
  comments: CommentView[];
  timezone: string;
}) {
  const { state, isPending, run } = useServerAction((fd) => addComment(churchSlug, fd));
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-heading text-sm font-semibold">Comentários</h3>
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-xs">{getInitials(c.author?.full_name ?? "?")}</AvatarFallback>
              </Avatar>
              <div className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm">
                <div className="mb-0.5 flex items-baseline gap-2">
                  <span className="font-medium">{c.author?.full_name ?? "Ex-membro"}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatInTimeZone(new Date(c.created_at), timezone, "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-secondary-foreground">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={run} className="flex flex-col gap-2">
        <input type="hidden" name="content_id" value={contentId} />
        <Textarea name="body" placeholder="Escreva um comentário" rows={2} required />
        {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
        <Button type="submit" size="sm" className="self-end" disabled={isPending}>
          {isPending ? "Enviando…" : "Comentar"}
        </Button>
      </form>
    </section>
  );
}
