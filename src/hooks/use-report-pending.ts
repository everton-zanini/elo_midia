"use client";

import { useEffect, useId } from "react";
import { useLoadingContext } from "@/components/loading/loading-provider";

/**
 * Registra um estado de pendência local (isPending) no overlay global de
 * carregamento. Não altera a lógica de nenhuma ação — só informa a UI.
 */
export function useReportPending(isPending: boolean, message?: string) {
  const id = useId();
  const { setTask } = useLoadingContext();

  useEffect(() => {
    setTask(id, isPending ? { message } : null);
    return () => setTask(id, null);
  }, [id, isPending, message, setTask]);
}
