import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

interface Limit {
  limit: number;
  windowSeconds: number;
}

export const LIMITS = {
  login: { limit: 8, windowSeconds: 15 * 60 },
  availability: { limit: 90, windowSeconds: 60 },
  bookingPerIp: { limit: 6, windowSeconds: 60 * 60 },
  bookingPerPhone: { limit: 4, windowSeconds: 24 * 60 * 60 },
} satisfies Record<string, Limit>;

/**
 * Janela fixa com contador atômico no PostgreSQL — funciona com várias
 * instâncias da aplicação, sem depender de memória local.
 */
export async function hit(key: string, { limit, windowSeconds }: Limit): Promise<{ allowed: boolean; retryAfter: number }> {
  const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."resetAt" <= now() THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= now() THEN EXCLUDED."resetAt" ELSE "RateLimitBucket"."resetAt" END
    RETURNING "count", "resetAt"`;
  const row = rows[0]!;
  if (Math.random() < 0.01) {
    void prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date() } } }).catch(() => undefined);
  }
  return { allowed: row.count <= limit, retryAfter: Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000)) };
}

export async function enforce(key: string, limit: Limit, message = "Muitas tentativas. Aguarde um pouco e tente novamente."): Promise<void> {
  if (process.env.RATE_LIMIT_DISABLED === "true" && process.env.NODE_ENV !== "production") return;
  const r = await hit(key, limit);
  if (!r.allowed) throw new AppError("RATE_LIMITED", message, { retryAfter: r.retryAfter });
}

export async function resetLimit(key: string): Promise<void> {
  await prisma.rateLimitBucket.deleteMany({ where: { key } });
}
