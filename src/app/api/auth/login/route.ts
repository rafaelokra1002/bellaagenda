import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { loginSchema } from "@/validation/admin";
import { assertSameOrigin, clientIp, json, parseBody, route } from "@/server/http";
import { enforce, LIMITS, resetLimit } from "@/server/rate-limit";
import { dummyVerify, verifyPassword } from "@/server/auth/password";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/server/auth/session";

const INVALID = "E-mail ou senha incorretos.";

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const { email, password } = await parseBody(req, loginSchema);
  await enforce(`login:ip:${clientIp(req)}`, LIMITS.login, "Muitas tentativas de login. Aguarde 15 minutos.");
  await enforce(`login:email:${email}`, LIMITS.login, "Muitas tentativas de login. Aguarde 15 minutos.");

  const user = await prisma.user.findUnique({ where: { email }, include: { professional: { select: { id: true } } } });
  // Mesma mensagem e custo de processamento para e-mail inexistente ou senha errada.
  const ok = user ? await verifyPassword(password, user.passwordHash) : await dummyVerify(password);
  if (!user || !ok || !user.professional) throw new AppError("UNAUTHORIZED", INVALID);

  await resetLimit(`login:email:${email}`);
  const { token, expiresAt } = await createSession(user.id);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return json({ ok: true });
});
