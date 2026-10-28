import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export const SESSION_COOKIE = "bella_session";

export interface AuthContext {
  userId: string;
  userName: string;
  email: string;
  professionalId: string;
  professionalSlug: string;
  professionalName: string;
  timezone: string;
}

function sessionTtlMs(): number {
  const days = Number(process.env.SESSION_TTL_DAYS ?? 7);
  return (Number.isFinite(days) && days > 0 ? days : 7) * 86_400_000;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionTtlMs());
  await prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  // Limpeza oportunista de sessões expiradas do mesmo usuário.
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  return { token, expiresAt };
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function resolveSession(token: string | undefined | null): Promise<AuthContext | null> {
  if (!token || token.length > 200) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { professional: true } } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  const professional = session.user.professional;
  if (!professional) return null;
  return {
    userId: session.user.id,
    userName: session.user.name,
    email: session.user.email,
    professionalId: professional.id,
    professionalSlug: professional.slug,
    professionalName: professional.name,
    timezone: professional.timezone,
  };
}

export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

/** Autentica uma requisição de API a partir do cookie. Lança 401 se inválida. */
export async function authenticateRequest(req: Request): Promise<AuthContext> {
  const ctx = await resolveSession(readCookie(req.headers.get("cookie"), SESSION_COOKIE));
  if (!ctx) throw new AppError("UNAUTHORIZED", "Sua sessão expirou. Entre novamente.");
  return ctx;
}

/** Cookie `Secure` sempre que o site é servido por HTTPS (navegadores descartam cookies Secure em HTTP). */
function useSecureCookie(): boolean {
  const appUrl = process.env.APP_URL;
  if (appUrl) return appUrl.startsWith("https://");
  return process.env.NODE_ENV === "production";
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: useSecureCookie(),
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}
