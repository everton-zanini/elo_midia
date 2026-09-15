"use client";

import { LoadingIndicator } from "@/components/loading/loading-indicator";
import { useLoadingContext } from "@/components/loading/loading-provider";

/**
 * Overlay bloqueante de "processando", montado uma única vez no layout raiz.
 * Não usa os primitivos de Dialog/AlertDialog: uma ação em andamento não
 * deve poder ser fechada com clique fora ou Esc.
 */
export function GlobalLoadingOverlay() {
  const { visible, message } = useLoadingContext();

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-xs"
    >
      <div className="rounded-xl bg-popover p-6 text-popover-foreground shadow-lg ring-1 ring-foreground/10">
        <LoadingIndicator message={message} className="py-0" />
      </div>
    </div>
  );
}
