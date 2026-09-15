"use client";

import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserChurchSummary } from "@/server/church";
import { cn } from "@/lib/utils";

export function ChurchSwitcher({
  churches,
  currentSlug,
  variant = "sidebar",
}: {
  churches: UserChurchSummary[];
  currentSlug: string;
  variant?: "sidebar" | "compact";
}) {
  const router = useRouter();
  const current = churches.find((c) => c.church.slug === currentSlug);

  if (churches.length <= 1) {
    return (
      <div className={cn("flex items-center gap-2 truncate text-sm font-medium", variant === "sidebar" && "text-sidebar-foreground")}>
        <Building2 className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
        <span className="truncate">{current?.church.name ?? "Elo Mídia"}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium transition-colors",
              variant === "sidebar"
                ? "text-sidebar-foreground hover:bg-sidebar-accent"
                : "hover:bg-secondary"
            )}
          >
            <Building2 className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
            <span className="truncate">{current?.church.name ?? "Escolher igreja"}</span>
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Suas igrejas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {churches.map(({ church }) => (
          <DropdownMenuItem key={church.id} onClick={() => router.push(`/app/${church.slug}`)}>
            <span className="flex-1 truncate">{church.name}</span>
            {church.slug === currentSlug ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
