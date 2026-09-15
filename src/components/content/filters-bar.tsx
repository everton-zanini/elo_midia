"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Filter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHANNEL_LABELS, PRIORITY_LABELS, STAGE_LABELS } from "@/lib/workflow";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
}

export function FiltersBar({
  ministries,
  members,
  showStageFilter = false,
}: {
  ministries: FilterOption[];
  members: FilterOption[];
  showStageFilter?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState(false);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const activeCount = ["etapa", "responsavel", "canal", "ministerio", "prioridade", "periodo_de", "periodo_ate"].filter(
    (k) => searchParams.get(k)
  ).length;

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título"
            defaultValue={searchParams.get("q") ?? ""}
            onChange={(e) => updateParam("q", e.target.value)}
            className="pl-8"
            aria-label="Buscar por título"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="sm:hidden"
          onClick={() => setExpanded((v) => !v)}
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filtros{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
      </div>

      <div className={cn("mt-3 flex flex-wrap gap-2", expanded ? "flex" : "hidden sm:flex")}>
        {showStageFilter ? (
          <Select
            items={{ all: "Todas as etapas", ...STAGE_LABELS }}
            value={searchParams.get("etapa") ?? "all"}
            onValueChange={(v) => updateParam("etapa", v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Etapa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as etapas</SelectItem>
              {Object.entries(STAGE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Select
          items={{ all: "Todos os responsáveis", ...Object.fromEntries(members.map((m) => [m.value, m.label])) }}
          value={searchParams.get("responsavel") ?? "all"}
          onValueChange={(v) => updateParam("responsavel", v === "all" ? "" : v)}
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
          onValueChange={(v) => updateParam("canal", v === "all" ? "" : v)}
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
          onValueChange={(v) => updateParam("ministerio", v === "all" ? "" : v)}
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

        <Select
          items={{ all: "Todas as prioridades", ...PRIORITY_LABELS }}
          value={searchParams.get("prioridade") ?? "all"}
          onValueChange={(v) => updateParam("prioridade", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as prioridades</SelectItem>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={{ producao: "Período: prazo de produção", publicacao: "Período: publicação" }}
          value={searchParams.get("periodo_tipo") ?? "producao"}
          onValueChange={(v) => updateParam("periodo_tipo", v)}
        >
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="producao">Período: prazo de produção</SelectItem>
            <SelectItem value="publicacao">Período: publicação</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="w-[150px]"
          aria-label="De"
          defaultValue={searchParams.get("periodo_de") ?? ""}
          onChange={(e) => updateParam("periodo_de", e.target.value)}
        />
        <Input
          type="date"
          className="w-[150px]"
          aria-label="Até"
          defaultValue={searchParams.get("periodo_ate") ?? ""}
          onChange={(e) => updateParam("periodo_ate", e.target.value)}
        />

        {activeCount > 0 || searchParams.get("q") ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => router.push(pathname)}>
            <X className="h-4 w-4" aria-hidden="true" />
            Limpar filtros
          </Button>
        ) : null}
      </div>
    </div>
  );
}
