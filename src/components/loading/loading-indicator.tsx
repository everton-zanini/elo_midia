import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingIndicator({
  message = "Processando…",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-10 text-center", className)}>
      <Loader2Icon className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  );
}
