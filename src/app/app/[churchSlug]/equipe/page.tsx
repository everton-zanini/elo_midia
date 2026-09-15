import { requireChurchContext } from "@/server/church";
import { listMembers } from "@/server/data/team";
import { listPendingInvites } from "@/server/data/invites";
import { listMinistries } from "@/server/data/ministries";
import { MembersSection } from "@/components/team/members-section";
import { InvitesSection } from "@/components/team/invites-section";
import { ChurchSettingsForm } from "@/components/team/church-settings-form";
import { MinistriesSection } from "@/components/team/ministries-section";
import { isManager } from "@/lib/workflow";

export const metadata = { title: "Equipe e configurações" };

export default async function TeamPage({ params }: PageProps<"/app/[churchSlug]/equipe">) {
  const { churchSlug } = await params;
  const { church, membership, supabase } = await requireChurchContext(churchSlug);
  const admin = membership.role === "admin";

  const [members, invites, ministries] = await Promise.all([
    listMembers(supabase, church.id),
    admin ? listPendingInvites(supabase, church.id) : Promise.resolve([]),
    listMinistries(supabase, church.id, true),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Equipe e configurações</h1>
        <p className="text-sm text-muted-foreground">{church.name}</p>
      </div>

      <MembersSection churchSlug={churchSlug} members={members} canManage={admin} currentUserId={membership.user_id} />

      {admin ? (
        <>
          <InvitesSection churchSlug={churchSlug} invites={invites} timezone={church.timezone} />
          <MinistriesSection churchSlug={churchSlug} ministries={ministries} />
          <ChurchSettingsForm churchSlug={churchSlug} church={church} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Convites, ministérios e configurações da igreja só podem ser gerenciados por administradores.
        </p>
      )}
      {!admin && isManager(membership.role) ? (
        <p className="text-xs text-muted-foreground">
          Como coordenador, você gerencia conteúdos e tarefas, mas não membros nem configurações da igreja.
        </p>
      ) : null}
    </div>
  );
}
