"use client";

import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";

export function ViewToggle({
  kanban,
  list,
}: {
  kanban: React.ReactNode;
  list: React.ReactNode;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [override, setOverride] = useState<"kanban" | "lista" | null>(null);
  const view = override ?? (isDesktop ? "kanban" : "lista");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant={view === "kanban" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setOverride("kanban")}
          aria-pressed={view === "kanban"}
        >
          <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          Kanban
        </Button>
        <Button
          type="button"
          variant={view === "lista" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setOverride("lista")}
          aria-pressed={view === "lista"}
        >
          <List className="h-4 w-4" aria-hidden="true" />
          Lista
        </Button>
      </div>
      {view === "kanban" ? kanban : list}
    </div>
  );
}
