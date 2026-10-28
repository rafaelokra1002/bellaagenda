import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";

export const TZ = "America/Bahia";

/** Limpa as tabelas entre testes — recusa rodar fora de um banco de testes. */
export async function resetDb() {
  if (!/test/i.test(new URL(process.env.DATABASE_URL ?? "postgresql://x/none").pathname)) {
    throw new Error("resetDb só pode rodar em um banco de testes.");
  }
  await prisma.$executeRawUnsafe(
    `TRUNCATE "AppointmentAudit","Appointment","AvailabilityBlock","BusinessHour","Customer","Service","Session","Professional","User","RateLimitBucket" CASCADE`,
  );
}

let counter = 0;

/** Profissional com expediente seg–sex 08–12 e 14–18 e dois serviços. */
export async function makeProfessional(opts: { allWeek?: boolean; minNoticeMinutes?: number } = {}) {
  counter++;
  const days = opts.allWeek ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  const user = await prisma.user.create({
    data: {
      name: `Profissional ${counter}`,
      email: `pro${counter}@teste.local`,
      passwordHash: await hashPassword("senha-de-teste-123"),
      professional: {
        create: {
          name: `Profissional ${counter}`,
          slug: `pro-${counter}`,
          whatsapp: "5571900000000",
          timezone: TZ,
          slotStepMinutes: 30,
          minNoticeMinutes: opts.minNoticeMinutes ?? 60,
          maxAdvanceDays: 60,
          businessHours: {
            create: days.flatMap((d) => [
              { dayOfWeek: d, startTime: "08:00", endTime: "12:00" },
              { dayOfWeek: d, startTime: "14:00", endTime: "18:00" },
            ]),
          },
          services: {
            create: [
              { name: "Extensão de cílios", price: "120.00", durationMinutes: 120, bufferMinutes: 15 },
              { name: "Design de sobrancelhas", price: "35.00", durationMinutes: 30 },
            ],
          },
        },
      },
    },
    include: { professional: { include: { services: { orderBy: { durationMinutes: "desc" } } } } },
  });
  const professional = user.professional!;
  const [longService, shortService] = professional.services as [(typeof professional.services)[number], (typeof professional.services)[number]];
  const { token } = await createSession(user.id);
  return { user, professional, longService, shortService, token, auth: { professionalId: professional.id, userId: user.id } };
}

export function booking(serviceId: string, startAt: Date, phoneSuffix: string | number, name = "Cliente Teste") {
  return {
    serviceId,
    startAt: startAt.toISOString(),
    name,
    whatsapp: `71 9${String(phoneSuffix).padStart(8, "0")}`,
    consent: true as const,
  };
}

export function req(url: string, init: { method?: string; body?: unknown; token?: string; ip?: string; origin?: string } = {}) {
  const headers: Record<string, string> = { host: "localhost:3000" };
  if (init.body !== undefined) headers["content-type"] = "application/json";
  if (init.token) headers.cookie = `bella_session=${init.token}`;
  if (init.ip) headers["x-forwarded-for"] = init.ip;
  if (init.origin) headers.origin = init.origin;
  return new Request(`http://localhost:3000${url}`, {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

export const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });
