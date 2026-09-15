"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { NAV_ITEMS, MORE_NAV_ITEM } from "./nav-items";
import { ChurchSwitcher } from "./church-switcher";
import { UserMenu } from "./user-menu";
import { cn } from "@/lib/utils";
import type { UserChurchSummary } from "@/server/church";
import type { MembershipRole } from "@/lib/supabase/types";

export function AppSidebar({
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
  const items = [...NAV_ITEMS, MORE_NAV_ITEM];

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2 px-4">
        <Logo className="text-sidebar-foreground [&_span]:text-sidebar-foreground" iconClassName="h-7 w-7" />
      </div>
      <div className="px-3 pb-2">
        <ChurchSwitcher churches={churches} currentSlug={churchSlug} />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Navegação principal">
        {items.map((item) => {
          const active = item.match(pathname, churchSlug);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href(churchSlug)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4.5 w-4.5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border px-3 py-3">
        <UserMenu name={profile.full_name} email={profile.email} role={role} churchSlug={churchSlug} />
      </div>
    </aside>
  );
}
