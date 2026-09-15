import { WifiOff } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export const metadata = { title: "Sem conexão" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <Logo iconClassName="h-10 w-10" className="text-2xl" />
      <WifiOff className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <div>
        <h1 className="font-heading text-lg font-bold">Sem conexão com a internet</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          O Elo Mídia precisa de internet para funcionar. Verifique sua conexão e tente novamente.
        </p>
      </div>
    </div>
  );
}
