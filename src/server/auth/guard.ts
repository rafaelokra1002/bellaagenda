import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveSession, SESSION_COOKIE, type AuthContext } from "./session";

/** Sessão da requisição atual (Server Components), memoizada por requisição. */
export const getCurrentAuth = cache(async (): Promise<AuthContext | null> => {
  const store = await cookies();
  return resolveSession(store.get(SESSION_COOKIE)?.value);
});

/** Exige uma profissional autenticada; redireciona para /login caso contrário. */
export async function requireAuth(): Promise<AuthContext> {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");
  return auth;
}
