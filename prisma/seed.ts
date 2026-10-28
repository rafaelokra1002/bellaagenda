/**
 * Dados FICTÍCIOS de demonstração — somente desenvolvimento.
 *
 *   npm run db:seed
 *
 * Cria (ou recria) a profissional de demonstração "studio-demo" com serviços,
 * expediente e agendamentos marcados como isDemo. A senha da conta demo vem de
 * DEMO_ADMIN_PASSWORD ou é gerada aleatoriamente e exibida no terminal.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaClient, type AppointmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { assertNotProduction } from "../scripts/guard";
import { DEMO_HOURS, DEMO_PROFILE, DEMO_SERVICES, DEMO_SLUG, DEMO_TZ } from "./demo-data";
import { addDays, dayOfWeek, MINUTE_MS, toLocalDate, zonedToUtc } from "../src/lib/time";

assertNotProduction("O seed de demonstração");

const prisma = new PrismaClient();
const TZ = DEMO_TZ;
const DEMO_EMAIL = "demo@bellaagenda.local";
const SERVICES = DEMO_SERVICES;
const HOURS = DEMO_HOURS;

const CUSTOMERS = [
  { name: "Cliente Demonstração Ana", whatsapp: "5571900000001" },
  { name: "Cliente Demonstração Bia", whatsapp: "5571900000002" },
  { name: "Cliente Demonstração Carla", whatsapp: "5571900000003" },
  { name: "Cliente Demonstração Duda", whatsapp: "5571900000004" },
];

function workingDays(from: string, count: number, direction: 1 | -1): string[] {
  const out: string[] = [];
  let d = from;
  while (out.length < count) {
    d = addDays(d, direction);
    const dow = dayOfWeek(d);
    if (dow >= 1 && dow <= 5) out.push(d);
  }
  return out;
}

async function main() {
  const password = process.env.DEMO_ADMIN_PASSWORD || randomBytes(9).toString("base64url");

  // Recria do zero: remove agendamentos antes (FK restritiva) e depois o usuário (cascata).
  const old = await prisma.user.findUnique({ where: { email: DEMO_EMAIL }, include: { professional: true } });
  if (old?.professional) await prisma.appointment.deleteMany({ where: { professionalId: old.professional.id } });
  if (old) await prisma.user.delete({ where: { id: old.id } });

  const user = await prisma.user.create({
    data: {
      name: "Conta Demonstração",
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(password, 12),
      professional: { create: DEMO_PROFILE },
    },
    include: { professional: true },
  });
  const professional = user.professional!;

  const services = [];
  for (const [i, s] of SERVICES.entries()) {
    services.push(await prisma.service.create({ data: { ...s, professionalId: professional.id, sortOrder: i } }));
  }
  await prisma.businessHour.createMany({ data: HOURS.map((h) => ({ ...h, professionalId: professional.id })) });

  const customers = [];
  for (const c of CUSTOMERS) {
    customers.push(await prisma.customer.create({ data: { ...c, professionalId: professional.id, isDemo: true, consentAt: new Date() } }));
  }

  const today = toLocalDate(new Date(), TZ);
  const [past1, past2, past3] = workingDays(today, 3, -1) as [string, string, string];
  const [next1, next2, next3] = workingDays(today, 3, 1) as [string, string, string];

  const plan: Array<{ date: string; time: string; svc: number; cust: number; status: AppointmentStatus }> = [
    { date: past3, time: "08:00", svc: 0, cust: 0, status: "CONCLUIDO" },
    { date: past3, time: "14:00", svc: 2, cust: 1, status: "CONCLUIDO" },
    { date: past2, time: "09:00", svc: 1, cust: 2, status: "CONCLUIDO" },
    { date: past2, time: "15:00", svc: 4, cust: 3, status: "NAO_COMPARECEU" },
    { date: past1, time: "10:00", svc: 3, cust: 1, status: "CANCELADO" },
    { date: next1, time: "08:00", svc: 0, cust: 2, status: "CONFIRMADO" },
    { date: next1, time: "14:00", svc: 2, cust: 3, status: "PENDENTE" },
    { date: next2, time: "09:00", svc: 1, cust: 0, status: "PENDENTE" },
    { date: next3, time: "15:00", svc: 4, cust: 1, status: "CONFIRMADO" },
  ];

  for (const p of plan) {
    const svc = services[p.svc]!;
    const startAt = zonedToUtc(p.date, p.time, TZ);
    const endAt = new Date(startAt.getTime() + svc.durationMinutes * MINUTE_MS);
    const occupiedUntil = new Date(endAt.getTime() + (svc.bufferMinutes ?? 0) * MINUTE_MS);
    const appt = await prisma.appointment.create({
      data: {
        professionalId: professional.id,
        serviceId: svc.id,
        customerId: customers[p.cust]!.id,
        startAt,
        endAt,
        occupiedUntil,
        serviceNameSnapshot: svc.name,
        priceSnapshot: svc.price,
        status: p.status,
        cancelledAt: p.status === "CANCELADO" ? new Date() : null,
        customerNotes: "Agendamento fictício de demonstração.",
        publicToken: randomBytes(18).toString("base64url"),
        isDemo: true,
      },
    });
    await prisma.appointmentAudit.create({ data: { appointmentId: appt.id, action: "CRIADO", newStatus: "PENDENTE", newStartAt: startAt } });
    if (p.status !== "PENDENTE") {
      await prisma.appointmentAudit.create({
        data: { appointmentId: appt.id, action: "STATUS_ALTERADO", previousStatus: "PENDENTE", newStatus: p.status, changedByUserId: user.id },
      });
    }
  }

  console.log("\n✔ Dados de demonstração criados.");
  console.log(`  Página pública : /agendar/${DEMO_SLUG}`);
  console.log(`  Painel         : /login`);
  console.log(`  E-mail         : ${DEMO_EMAIL}`);
  console.log(`  Senha          : ${process.env.DEMO_ADMIN_PASSWORD ? "(valor de DEMO_ADMIN_PASSWORD)" : password}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
