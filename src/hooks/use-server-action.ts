"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/server/action-result";

/**
 * Fio condutor entre um <form action={...}> e uma Server Action com a
 * assinatura (formData) => Promise<ActionResult<T>>. Dá estado de
 * carregamento e erro prontos para a interface, sem precisar amarrar cada
 * ação a `useActionState` (que exigiria mudar a assinatura para receber o
 * estado anterior como primeiro argumento).
 */
export function useServerAction<T>(action: (formData: FormData) => Promise<ActionResult<T>>) {
  const [state, setState] = useState<ActionResult<T> | null>(null);
  const [isPending, startTransition] = useTransition();

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
