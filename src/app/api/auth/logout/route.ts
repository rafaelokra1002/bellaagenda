import { cookies } from "next/headers";
import { assertSameOrigin, json, route } from "@/server/http";
import { destroySession, SESSION_COOKIE } from "@/server/auth/session";

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const store = await cookies();
  await destroySession(store.get(SESSION_COOKIE)?.value);
  store.delete(SESSION_COOKIE);
  return json({ ok: true });
});
