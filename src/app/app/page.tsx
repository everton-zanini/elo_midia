import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { listUserChurches } from "@/server/church";
import { signOut } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/roles";

export default async function AppIndexPage() {
  const churches = await listUserChurches();

  if (churches.length === 1) {
    redirect(`/app/${churches[0].church.slug}`);
  }

  if (churches.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
        <Logo iconClassName="h-10 w-10" className="text-2xl" />
        <div className="max-w-sm">
          <h1 className="font-heading text-lg font-bold">Você ainda não faz parte de nenhuma igreja</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Peça para um administrador te enviar um convite para a igreja no Elo Mídia.
          </p>
        </div>
        <form action={signOut}>
          <Button variant="outline" type="submit">
            Sair
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <Logo iconClassName="h-10 w-10" className="text-2xl" />
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="mb-4 font-heading text-lg font-bold">Escolha uma igreja</h1>
        <ul className="flex flex-col gap-2">
          {churches.map(({ church, role }) => (
            <li key={church.id}>
              <a
                href={`/app/${church.slug}`}
                className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary"
              >
                <span className="font-medium">{church.name}</span>
                <span className="text-muted-foreground">{ROLE_LABELS[role]}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
