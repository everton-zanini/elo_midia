import { requireChurchContext, listUserChurches } from "@/server/church";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default async function ChurchLayout({
  children,
  params,
}: LayoutProps<"/app/[churchSlug]">) {
  const { churchSlug } = await params;
  const { profile, membership } = await requireChurchContext(churchSlug);
  const churches = await listUserChurches();

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar churchSlug={churchSlug} churches={churches} profile={profile} role={membership.role} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
        <MobileBottomNav churchSlug={churchSlug} churches={churches} profile={profile} role={membership.role} />
      </div>
    </div>
  );
}
