import type { ApiErrorBody, ErrorCode } from "./errors";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly code: ErrorCode | "NETWORK",
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/** fetch JSON com mensagens de erro amigáveis (inclusive falha de rede). */
export async function apiFetch<T>(url: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiClientError("Sem conexão com a internet. Verifique sua rede e tente novamente.", "NETWORK", 0);
  }
  const data = (await res.json().catch(() => null)) as (T & Partial<ApiErrorBody>) | null;
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && window.location.pathname.startsWith("/painel")) {
      window.location.href = "/login";
    }
    const e = data?.error;
    throw new ApiClientError(e?.message ?? "Não foi possível concluir. Tente novamente.", e?.code ?? "INTERNAL", res.status, e?.details);
  }
  return data as T;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Algo deu errado. Tente novamente.";
}
