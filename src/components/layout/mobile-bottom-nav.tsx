"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NAV_ITEMS, MORE_ICON } from "./nav-items";
import { cn } from "@/lib/utils";
import { ChurchSwitcher } from "./church-switcher";
import { UserMenu } from "./user-menu";
import type { UserChurchSummary } from "@/server/church";
import type { MembershipRole } from "@/lib/supabase/types";
import { Users } from "lucide-react";

export function MobileBottomNav({
  churchSlug,
  churches,
  profile,
  role,
}: {
  churchSlug: string;
  churches: UserChurchSummary[];
  profile: { full_name: string; email: string };
  role: MembershipRole;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const isMoreActive = pathname.startsWith(`/app/${churchSlug}/equipe`);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Navegação principal"
      >
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname, churchSlug);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href(churchSlug)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
            isMoreActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          <MORE_ICON className="h-5 w-5" aria-hidden="true" />
          Mais
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <SheetHeader>
            <SheetTitle>Mais</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-2">
            <ChurchSwitcher churches={churches} currentSlug={churchSlug} variant="compact" />
            <Link
              href={`/app/${churchSlug}/equipe`}
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 text-sm font-medium hover:bg-secondary"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              Equipe e configurações
            </Link>
            <div className="border-t border-border pt-3">
              <UserMenu name={profile.full_name} email={profile.email} role={role} churchSlug={churchSlug} variant="compact" />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
