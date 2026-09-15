"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/server/action-result";
import { useReportPending } from "@/hooks/use-report-pending";

/**
 * Fio condutor entre um <form action={...}> e uma Server Action com a
 * assinatura (formData) => Promise<ActionResult<T>>. Dá estado de
 * carregamento e erro prontos para a interface, sem precisar amarrar cada
 * ação a `useActionState` (que exigiria mudar a assinatura para receber o
 * estado anterior como primeiro argumento). Também reporta a pendência ao
 * overlay global de carregamento automaticamente.
 */
export function useServerAction<T>(action: (formData: FormData) => Promise<ActionResult<T>>) {
  const [state, setState] = useState<ActionResult<T> | null>(null);
  const [isPending, startTransition] = useTransition();

  useReportPending(isPending);

  function run(formData: FormData) {
    startTransition(async () => {
      const result = await action(formData);
      setState(result);
    });
  }

  function reset() {
    setState(null);
  }

  return { state, isPending, run, reset };
}
