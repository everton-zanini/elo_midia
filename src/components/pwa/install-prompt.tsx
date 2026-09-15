"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function wasDismissed(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem("elo-midia-install-dismissed") === "1";
}

/**
 * Oferece a instalação do PWA quando o navegador suporta o prompt nativo
 * (Chrome/Edge/Android); no iOS/Safari, que não tem esse evento, mostra uma
 * orientação de como adicionar à tela de início pelo menu Compartilhar.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [showIosHint] = useState(() => !isStandalone() && isIos());

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return;

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setDismissed(true);
    sessionStorage.setItem("elo-midia-install-dismissed", "1");
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (dismissed || (!deferredPrompt && !showIosHint)) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 z-40 flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-md md:bottom-4 md:left-auto md:right-4 md:w-80">
      <Download className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="flex-1 text-sm">
        {deferredPrompt ? (
          <>
            <p className="font-medium">Instalar o Elo Mídia</p>
            <p className="text-muted-foreground">Acesse mais rápido, direto da tela inicial.</p>
          </>
        ) : (
          <>
            <p className="font-medium">Adicione à tela de início</p>
            <p className="text-muted-foreground">Toque em Compartilhar e depois em &quot;Adicionar à Tela de Início&quot;.</p>
          </>
        )}
      </div>
      {deferredPrompt ? (
        <Button size="sm" onClick={handleInstall}>
          Instalar
        </Button>
      ) : null}
      <Button variant="ghost" size="icon-sm" aria-label="Dispensar" onClick={dismiss}>
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
