export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(message: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, message, fieldErrors };
}

/**
 * Converte um erro do Postgres/PostgREST em uma mensagem em português.
 * As funções e gatilhos do banco já lançam exceções com texto em português
 * (RAISE EXCEPTION 'Mensagem...'), então normalmente basta repassar
 * error.message. Só tratamos aqui os casos "genéricos" do Postgres.
 */
export function toUserMessage(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return "Ocorreu um erro inesperado. Tente novamente.";
  const message = error.message ?? "";

  if (message.includes("row-level security") || error.code === "42501") {
    return "Você não tem permissão para fazer isso.";
  }
  if (error.code === "23505") {
    return "Já existe um registro com esses dados.";
  }
  if (error.code === "P0002" || message.includes("outra pessoa")) {
    return message;
  }
  // Mensagens vindas de RAISE EXCEPTION nas funções/gatilhos já estão em português.
  if (message) return message;
  return "Ocorreu um erro inesperado. Tente novamente.";
}
