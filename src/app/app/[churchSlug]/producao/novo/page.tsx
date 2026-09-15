import { requireChurchContext } from "@/server/church";
import { listMinistries } from "@/server/data/ministries";
import { NewContentForm } from "./new-content-form";

export const metadata = { title: "Nova solicitação" };

export default async function NewContentPage({
  params,
  searchParams,
}: PageProps<"/app/[churchSlug]/producao/novo">) {
  const { churchSlug } = await params;
  const sp = await searchParams;
  const { church, supabase } = await requireChurchContext(churchSlug);
  const ministries = await listMinistries(supabase, church.id);
  const data = typeof sp.data === "string" ? sp.data : undefined;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="font-heading text-xl font-bold">Nova solicitação de conteúdo</h1>
        <p className="text-sm text-muted-foreground">
          Toda solicitação começa aqui. Administradores e coordenadores farão a triagem em seguida.
        </p>
      </div>
      <NewContentForm churchSlug={churchSlug} ministries={ministries} timezone={church.timezone} initialDate={data} />
    </div>
  );
}
