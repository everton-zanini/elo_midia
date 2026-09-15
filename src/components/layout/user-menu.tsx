"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import { signOut } from "@/server/actions/auth-actions";
import { ROLE_LABELS } from "@/lib/roles";
import type { MembershipRole } from "@/lib/supabase/types";

export function UserMenu({
  name,
  email,
  role,
  churchSlug,
  variant = "sidebar",
}: {
  name: string;
  email: string;
  role: MembershipRole;
  churchSlug: string;
  variant?: "sidebar" | "compact";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={
              variant === "sidebar"
                ? "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-sidebar-accent"
                : "flex items-center gap-2 rounded-full"
            }
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-highlight text-highlight-foreground text-xs font-semibold">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            {variant === "sidebar" ? (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-sidebar-foreground">{name}</span>
                <span className="block truncate text-xs text-sidebar-foreground/70">{ROLE_LABELS[role]}</span>
              </span>
            ) : null}
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link href={`/app/${churchSlug}/equipe`}>
              <Settings className="h-4 w-4" aria-hidden="true" />
              Equipe e configurações
            </Link>
          }
        />
        <DropdownMenuSeparator />
        <form action={signOut} className="w-full">
          <DropdownMenuItem
            variant="destructive"
            render={
              <button type="submit" className="w-full text-left">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sair
              </button>
            }
          />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
