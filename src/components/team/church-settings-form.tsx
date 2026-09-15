"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServerAction } from "@/hooks/use-server-action";
import { updateChurchSettings } from "@/server/actions/church-actions";
import type { Church } from "@/lib/supabase/types";

const COMMON_TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Bahia",
  "America/Rio_Branco",
  "America/Noronha",
];

export function ChurchSettingsForm({ churchSlug, church }: { churchSlug: string; church: Church }) {
  const { state, isPending, run } = useServerAction((fd) => updateChurchSettings(churchSlug, fd));

  useEffect(() => {
    if (state?.ok) toast.success("Configurações salvas.");
  }, [state]);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-base font-semibold">Igreja</h2>
      <form action={run} className="flex flex-col gap-4 rounded-lg border border-border p-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="church-name">Nome da igreja</Label>
          <Input id="church-name" name="name" defaultValue={church.name} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="church-timezone">Fuso horário</Label>
          <Select
            items={Object.fromEntries(COMMON_TIMEZONES.map((tz) => [tz, tz]))}
            name="timezone"
            defaultValue={church.timezone}
          >
            <SelectTrigger id="church-timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
        <Button type="submit" className="self-start" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar"}
        </Button>
      </form>
    </section>
  );
}
