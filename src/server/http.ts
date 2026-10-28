/**
 * Tratamento centralizado de erros e autenticaÃ§Ã£o para Route Handlers.
 */
import { Prisma } from "@prisma/client";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import { AppError, type ApiErrorBody } from "@/lib/errors";
import { authenticateRequest, type AuthContext } from "./auth/session";

type Params = Record<string, string>;
interface RouteContext {
  params: Promise<Params>;
}

export function json<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

/** Converte erros conhecidos em AppError; o resto vira erro interno genÃ©rico. */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) {
    return new AppError("VALIDATION", err.issues[0]?.message ?? "Dados invÃ¡lidos.", err.flatten().fieldErrors);
  }
  if (isExclusionViolation(err)) {
    return new AppError("SLOT_UNAVAILABLE", "Este horÃ¡rio acabou de ser reservado. Escolha outro horÃ¡rio.");
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return new AppError("CONFLICT", "JÃ¡ existe um registro com estes dados.");
    if (err.code === "P2025") return new AppError("NOT_FOUND", "Registro nÃ£o encontrado.");
    if (err.code === "P2003") return new AppError("CONFLICT", "Este registro possui vÃ­nculos e nÃ£o pode ser removido.");
  }
  return new AppError("INTERNAL", "Ocorreu um erro inesperado. Tente novamente.");
}

/** ViolaÃ§Ã£o da restriÃ§Ã£o EXCLUDE (cÃ³digo Postgres 23P01) â€” sobreposiÃ§Ã£o de atendimentos. */
export function isExclusionViolation(err: unknown): boolean {
  const text = err instanceof Error ? err.message : String(err);
  return text.includes("23P01") || text.includes("Appointment_no_overlap");
}

export function errorResponse(err: unknown): Response {
  const appErr = toAppError(err);
  if (appErr.code === "INTERNAL") console.error("[api] erro interno:", err);
  const body: ApiErrorBody = { error: { code: appErr.code, message: appErr.message, details: appErr.details } };
  const headers: Record<string, string> = {};
  const retry = (appErr.details as { retryAfter?: number } | undefined)?.retryAfter;
  if (appErr.code === "RATE_LIMITED" && retry) headers["Retry-After"] = String(retry);
  return Response.json(body, { status: appErr.status, headers });
}

export function route(handler: (req: Request, params: Params) => Promise<Response>) {
  return async (req: Request, ctx: RouteContext): Promise<Response> => {
    try {
      return await handler(req, (await ctx?.params) ?? {});
    } catch (err) {
      return errorResponse(err);
    }
  };
}

/** Bloqueia requisiÃ§Ãµes de escrita vindas de outra origem (defesa contra CSRF). */
export function assertSameOrigin(req: Request): void {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  if (!origin) return; // requisiÃ§Ãµes sem Origin (ex.: mesma origem em navegadores antigos, testes)
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AppError("FORBIDDEN", "Origem invÃ¡lida.");
  }
  if (!host || originHost !== host) throw new AppError("FORBIDDEN", "Origem nÃ£o permitida.");
}

/** Rota do painel: identidade da profissional vem SEMPRE da sessÃ£o, nunca do corpo. */
export function adminRoute(handler: (req: Request, auth: AuthContext, params: Params) => Promise<Response>) {
  return route(async (req, params) => {
    assertSameOrigin(req);
    const auth = await authenticateRequest(req);
    return handler(req, auth, params);
  });
}

export async function parseBody<T>(req: Request, schema: ZodType<T, ZodTypeDef, unknown>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new AppError("VALIDATION", "Corpo da requisiÃ§Ã£o invÃ¡lido.");
  }
  return schema.parse(raw);
}

export function parseQuery<T>(req: Request, schema: ZodType<T, ZodTypeDef, unknown>): T {
  const url = new URL(req.url);
  const obj: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    if (v !== "") obj[k] = v;
  });
  return schema.parse(obj);
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return ip.slice(0, 64);
}
