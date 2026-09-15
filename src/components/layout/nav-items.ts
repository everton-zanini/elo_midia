import type { LucideIcon } from "lucide-react";
import { CalendarDays, LayoutGrid, MoreHorizontal, Users } from "lucide-react";
import { Home } from "lucide-react";

export interface NavItem {
  href: (slug: string) => string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string, slug: string) => boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: (slug) => `/app/${slug}`,
    label: "Início",
    icon: Home,
    match: (pathname, slug) => pathname === `/app/${slug}`,
  },
  {
    href: (slug) => `/app/${slug}/producao`,
    label: "Produção",
    icon: LayoutGrid,
    match: (pathname, slug) => pathname.startsWith(`/app/${slug}/producao`),
  },
  {
    href: (slug) => `/app/${slug}/agenda`,
    label: "Agenda",
    icon: CalendarDays,
    match: (pathname, slug) => pathname.startsWith(`/app/${slug}/agenda`),
  },
];

export const MORE_NAV_ITEM: NavItem = {
  href: (slug) => `/app/${slug}/equipe`,
  label: "Equipe",
  icon: Users,
  match: (pathname, slug) => pathname.startsWith(`/app/${slug}/equipe`),
};

export const MORE_ICON: LucideIcon = MoreHorizontal;
