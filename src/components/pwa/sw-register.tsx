"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Silencioso: a instalação do PWA é um extra, não deve quebrar o app.
    });
  }, []);

  return null;
}
