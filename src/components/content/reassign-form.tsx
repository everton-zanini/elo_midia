"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServerAction } from "@/hooks/use-server-action";
import { reassignContent } from "@/server/actions/content-actions";

export function ReassignForm({
  churchSlug,
  contentId,
  version,
  currentAssigneeId,
  members,
}: {
  churchSlug: string;
  contentId: string;
  version: number;
  currentAssigneeId: string | null;
  members: { userId: string; fullName: string }[];
}) {
  const router = useRouter();
  const { state, run } = useServerAction((fd) => reassignContent(churchSlug, fd));

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  function handleChange(value: string | null) {
    const formData = new FormData();
    formData.set("content_id", contentId);
    formData.set("version", String(version));
    formData.set("assignee_id", value === "none" ? "" : (value ?? ""));
    run(formData);
  }

  return (
    <div className="flex flex-col gap-1">
      <Select
        items={{ none: "Sem responsável", ...Object.fromEntries(members.map((m) => [m.userId, m.fullName])) }}
        value={currentAssigneeId ?? "none"}
        onValueChange={handleChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Sem responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sem responsável</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.userId} value={m.userId}>
              {m.fullName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {state && !state.ok ? <p className="text-xs text-destructive">{state.message}</p> : null}
    </div>
  );
}
