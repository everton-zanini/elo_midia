"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHANNEL_LABELS } from "@/lib/workflow";

export function AgendaFiltersBar({
  ministries,
  members,
}: {
  ministries: { value: string; label: string }[];
  members: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Select
        items={{ all: "Todos os responsáveis", ...Object.fromEntries(members.map((m) => [m.value, m.label])) }}
        value={searchParams.get("responsavel") ?? "all"}
        onValueChange={(v) => updateParam("responsavel", v)}
      >
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os responsáveis</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={{ all: "Todos os canais", ...CHANNEL_LABELS }}
        value={searchParams.get("canal") ?? "all"}
        onValueChange={(v) => updateParam("canal", v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Canal" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os canais</SelectItem>
          {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={{ all: "Todos os ministérios", ...Object.fromEntries(ministries.map((m) => [m.value, m.label])) }}
        value={searchParams.get("ministerio") ?? "all"}
        onValueChange={(v) => updateParam("ministerio", v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Ministério" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os ministérios</SelectItem>
          {ministries.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
