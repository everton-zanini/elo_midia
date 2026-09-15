"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type LoadingTask = { message?: string };

type LoadingContextValue = {
  setTask: (id: string, task: LoadingTask | null) => void;
  visible: boolean;
  message?: string;
};

const LoadingContext = createContext<LoadingContextValue | null>(null);

/** Atraso antes de mostrar o overlay — evita "flash" em ações quase instantâneas. */
const SHOW_DELAY_MS = 200;
/** Tempo mínimo visível depois de aparecer — evita o overlay piscar rápido demais. */
const MIN_VISIBLE_MS = 300;

export function useLoadingContext() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoadingContext deve ser usado dentro de <LoadingProvider>.");
  }
  return context;
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const tasksRef = useRef(new Map<string, LoadingTask>());
  const shownAtRef = useRef<number | null>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);

  const latestMessage = useCallback(() => {
    let last: string | undefined;
    for (const task of tasksRef.current.values()) {
      if (task.message) last = task.message;
    }
    return last;
  }, []);

  const setTask = useCallback(
    (id: string, task: LoadingTask | null) => {
      if (task) {
        tasksRef.current.set(id, task);
      } else {
        tasksRef.current.delete(id);
      }

      const hasPending = tasksRef.current.size > 0;

      if (hasPending) {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
        if (shownAtRef.current) {
          setMessage(latestMessage());
        } else if (!showTimeoutRef.current) {
          showTimeoutRef.current = setTimeout(() => {
            showTimeoutRef.current = null;
            shownAtRef.current = Date.now();
            setMessage(latestMessage());
            setVisible(true);
          }, SHOW_DELAY_MS);
        }
      } else {
        if (showTimeoutRef.current) {
          clearTimeout(showTimeoutRef.current);
          showTimeoutRef.current = null;
        }
        if (shownAtRef.current && !hideTimeoutRef.current) {
          const remaining = Math.max(MIN_VISIBLE_MS - (Date.now() - shownAtRef.current), 0);
          hideTimeoutRef.current = setTimeout(() => {
            hideTimeoutRef.current = null;
            shownAtRef.current = null;
            setVisible(false);
          }, remaining);
        }
      }
    },
    [latestMessage]
  );

  return <LoadingContext.Provider value={{ setTask, visible, message }}>{children}</LoadingContext.Provider>;
}
