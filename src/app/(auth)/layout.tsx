import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <Logo iconClassName="h-10 w-10" className="text-2xl" />
        <p className="max-w-xs text-sm text-muted-foreground">A comunicação da sua igreja, em equipe.</p>
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">{children}</div>
    </div>
  );
}
