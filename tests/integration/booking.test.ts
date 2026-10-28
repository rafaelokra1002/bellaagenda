import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { zonedToUtc } from "@/lib/time";
import { isExclusionViolation } from "@/server/http";
import { changeAppointmentStatus, createPublicAppointment, rescheduleAppointment } from "@/server/appointments/service";
import { getAvailableSlots } from "@/server/availability/service";
import { createBlock } from "@/server/schedule/service";
import { booking, makeProfessional, resetDb, TZ } from "./helpers";

// Referência fixa: segunda-feira 07/01/2030, 07:00 em Salvador.
const NOW = zonedToUtc("2030-01-07", "07:00", TZ);
const TUE = "2030-01-08";
const at = (time: string, date = TUE) => zonedToUtc(date, time, TZ);

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
}

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("criação de agendamento", () => {
  it("grava o agendamento, a cliente e o histórico", async () => {
    const { professional, longService } = await makeProfessional();
    const { publicToken } = await createPublicAppointment(professional.slug, booking(longService.id, at("08:00"), 1, "Ana Souza"), NOW);

    const appt = await prisma.appointment.findUniqueOrThrow({ where: { publicToken }, include: { customer: true, audits: true } });
    expect(appt.status).toBe("PENDENTE");
    expect(appt.endAt.toISOString()).toBe(at("10:00").toISOString());
    expect(appt.occupiedUntil.toISOString()).toBe(at("10:15").toISOString()); // + 15 min de intervalo
    expect(appt.priceSnapshot.toFixed(2)).toBe("120.00");
    expect(appt.customer.whatsapp).toBe("5571900000001");
    expect(appt.customer.consentAt).not.toBeNull();
    expect(appt.audits).toHaveLength(1);
  });

  it("não duplica cliente por formatação diferente do telefone", async () => {
    const { professional, shortService } = await makeProfessional();
    await createPublicAppointment(professional.slug, { ...booking(shortService.id, at("08:00"), 0), whatsapp: "(71) 98888-7777" }, NOW);
    await createPublicAppointment(professional.slug, { ...booking(shortService.id, at("09:00"), 0), whatsapp: "+55 71 988887777" }, NOW);
    expect(await prisma.customer.count({ where: { professionalId: professional.id } })).toBe(1);
  });

  it("rejeita data passada, fora do expediente, horário desalinhado e serviço inativo", async () => {
    const { professional, longService, shortService } = await makeProfessional();
    await expectCode(createPublicAppointment(professional.slug, booking(shortService.id, at("09:00", "2030-01-04"), 1), NOW), "SLOT_UNAVAILABLE");
    await expectCode(createPublicAppointment(professional.slug, booking(shortService.id, at("12:30"), 1), NOW), "SLOT_UNAVAILABLE");
    await expectCode(createPublicAppointment(professional.slug, booking(shortService.id, at("19:00"), 1), NOW), "SLOT_UNAVAILABLE");
    await expectCode(createPublicAppointment(professional.slug, booking(shortService.id, at("08:10"), 1), NOW), "SLOT_UNAVAILABLE");
    // 120 min + 15 às 10:30 terminaria 12:45 → ultrapassa o expediente
    await expectCode(createPublicAppointment(professional.slug, booking(longService.id, at("10:30"), 1), NOW), "SLOT_UNAVAILABLE");
    // Sábado sem expediente
    await expectCode(createPublicAppointment(professional.slug, booking(shortService.id, at("09:00", "2030-01-12"), 1), NOW), "SLOT_UNAVAILABLE");

    await prisma.service.update({ where: { id: shortService.id }, data: { isActive: false } });
    await expectCode(createPublicAppointment(professional.slug, booking(shortService.id, at("09:00"), 1), NOW), "VALIDATION");
  });

  it("rejeita horário bloqueado (folga/férias)", async () => {
    const { professional, shortService } = await makeProfessional();
    await createBlock(professional.id, { startDate: TUE, startTime: "08:00", endDate: TUE, endTime: "10:00", reason: "Consulta" });
    await expectCode(createPublicAppointment(professional.slug, booking(shortService.id, at("09:00"), 1), NOW), "SLOT_UNAVAILABLE");
    await expect(createPublicAppointment(professional.slug, booking(shortService.id, at("10:00"), 1), NOW)).resolves.toBeTruthy();
  });

  it("impede sobreposição considerando a duração total e o intervalo", async () => {
    const { professional, longService, shortService } = await makeProfessional();
    await createPublicAppointment(professional.slug, booking(longService.id, at("08:00"), 1), NOW); // ocupa 08:00–10:15
    await expectCode(createPublicAppointment(professional.slug, booking(shortService.id, at("09:30"), 2), NOW), "SLOT_UNAVAILABLE");
    await expectCode(createPublicAppointment(professional.slug, booking(shortService.id, at("10:00"), 2), NOW), "SLOT_UNAVAILABLE");
    await expect(createPublicAppointment(professional.slug, booking(shortService.id, at("10:30"), 2), NOW)).resolves.toBeTruthy();
  });

  it("limita agendamentos em aberto por WhatsApp", async () => {
    const { professional, shortService } = await makeProfessional();
    for (const t of ["08:00", "09:00", "10:00"]) await createPublicAppointment(professional.slug, booking(shortService.id, at(t), 7), NOW);
    await expectCode(createPublicAppointment(professional.slug, booking(shortService.id, at("11:00"), 7), NOW), "CONFLICT");
  });
});

describe("concorrência", () => {
  it("de 10 reservas simultâneas no mesmo horário, só uma vence", async () => {
    const { professional, shortService } = await makeProfessional();
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) => createPublicAppointment(professional.slug, booking(shortService.id, at("14:00"), 100 + i), NOW)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of results.filter((r): r is PromiseRejectedResult => r.status === "rejected")) {
      expect((r.reason as AppError).code).toBe("SLOT_UNAVAILABLE");
    }
    expect(await prisma.appointment.count({ where: { professionalId: professional.id } })).toBe(1);
  });

  it("reservas simultâneas com inícios diferentes mas intervalos sobrepostos também conflitam", async () => {
    const { professional, longService, shortService } = await makeProfessional();
    const results = await Promise.allSettled([
      createPublicAppointment(professional.slug, booking(longService.id, at("14:00"), 201), NOW), // 14:00–16:15
      createPublicAppointment(professional.slug, booking(shortService.id, at("15:00"), 202), NOW),
      createPublicAppointment(professional.slug, booking(shortService.id, at("15:30"), 203), NOW),
    ]);
    const ok = await prisma.appointment.findMany({ where: { professionalId: professional.id }, orderBy: { startAt: "asc" } });
    for (let i = 1; i < ok.length; i++) expect(ok[i]!.startAt.getTime()).toBeGreaterThanOrEqual(ok[i - 1]!.occupiedUntil.getTime());
    expect(results.some((r) => r.status === "rejected")).toBe(true);
  });

  it("a restrição do banco barra sobreposição mesmo sem passar pela regra de negócio", async () => {
    const { professional, shortService } = await makeProfessional();
    const customer = await prisma.customer.create({ data: { professionalId: professional.id, name: "X", whatsapp: "5571911111111" } });
    const data = (start: string, end: string, token: string) => ({
      professionalId: professional.id,
      serviceId: shortService.id,
      customerId: customer.id,
      startAt: at(start),
      endAt: at(end),
      occupiedUntil: at(end),
      serviceNameSnapshot: "X",
      priceSnapshot: "10.00",
      publicToken: token,
    });
    await prisma.appointment.create({ data: data("08:00", "09:00", "tok-a-0000000001") });
    const err = await prisma.appointment.create({ data: data("08:30", "09:30", "tok-b-0000000001") }).catch((e: unknown) => e);
    expect(isExclusionViolation(err)).toBe(true);
    // Cancelados não ocupam: inserir sobreposto cancelado é permitido
    await expect(prisma.appointment.create({ data: { ...data("08:30", "09:30", "tok-c-0000000001"), status: "CANCELADO" } })).resolves.toBeTruthy();
  });
});

describe("cancelamento e remarcação", () => {
  it("cancelar libera o horário para outra cliente", async () => {
    const { professional, shortService, auth } = await makeProfessional();
    const { publicToken } = await createPublicAppointment(professional.slug, booking(shortService.id, at("08:00"), 1), NOW);
    const appt = await prisma.appointment.findUniqueOrThrow({ where: { publicToken } });
    await expectCode(createPublicAppointment(professional.slug, booking(shortService.id, at("08:00"), 2), NOW), "SLOT_UNAVAILABLE");

    await changeAppointmentStatus(auth, appt.id, "CANCELADO", NOW);
    const slots = await getAvailableSlots(prisma, { professional, date: TUE, durationMinutes: 30, bufferMinutes: 0, now: NOW });
    expect(slots.map((s) => s.time)).toContain("08:00");
    await expect(createPublicAppointment(professional.slug, booking(shortService.id, at("08:00"), 2), NOW)).resolves.toBeTruthy();

    const audits = await prisma.appointmentAudit.findMany({ where: { appointmentId: appt.id }, orderBy: { createdAt: "asc" } });
    expect(audits.map((a) => a.action)).toEqual(["CRIADO", "STATUS_ALTERADO"]);
    expect(audits[1]!.changedByUserId).toBe(auth.userId);
  });

  it("valida transições de status no servidor", async () => {
    const { professional, shortService, auth } = await makeProfessional();
    const { publicToken } = await createPublicAppointment(professional.slug, booking(shortService.id, at("08:00"), 1), NOW);
    const appt = await prisma.appointment.findUniqueOrThrow({ where: { publicToken } });
    // Concluir antes do horário não é permitido
    await expectCode(changeAppointmentStatus(auth, appt.id, "CONCLUIDO", NOW), "INVALID_TRANSITION");
    await changeAppointmentStatus(auth, appt.id, "CONFIRMADO", NOW);
    await changeAppointmentStatus(auth, appt.id, "CONCLUIDO", at("09:00"));
    await expectCode(changeAppointmentStatus(auth, appt.id, "CANCELADO", at("09:00")), "INVALID_TRANSITION");
  });

  it("remarca para horário livre e recusa horário ocupado", async () => {
    const { professional, shortService, auth } = await makeProfessional();
    const a = await createPublicAppointment(professional.slug, booking(shortService.id, at("08:00"), 1), NOW);
    await createPublicAppointment(professional.slug, booking(shortService.id, at("09:00"), 2), NOW);
    const appt = await prisma.appointment.findUniqueOrThrow({ where: { publicToken: a.publicToken } });

    await expectCode(rescheduleAppointment(auth, appt.id, at("09:00"), NOW), "SLOT_UNAVAILABLE");
    await expectCode(rescheduleAppointment(auth, appt.id, at("12:30"), NOW), "SLOT_UNAVAILABLE");
    // Remarcar para um horário que se sobrepõe a ele mesmo é permitido (ele é ignorado no cálculo)
    await rescheduleAppointment(auth, appt.id, at("08:30"), NOW);
    const moved = await rescheduleAppointment(auth, appt.id, at("15:00"), NOW);
    expect(moved.startAt.toISOString()).toBe(at("15:00").toISOString());
    expect(moved.endAt.toISOString()).toBe(at("15:30").toISOString());

    const last = await prisma.appointmentAudit.findFirstOrThrow({ where: { appointmentId: appt.id, action: "REMARCADO" }, orderBy: { createdAt: "desc" } });
    expect(last.previousStartAt?.toISOString()).toBe(at("08:30").toISOString());
    expect(last.newStartAt?.toISOString()).toBe(at("15:00").toISOString());

    await changeAppointmentStatus(auth, appt.id, "CANCELADO", NOW);
    await expectCode(rescheduleAppointment(auth, appt.id, at("16:00"), NOW), "INVALID_TRANSITION");
  });
});

describe("isolamento entre profissionais", () => {
  it("agenda de uma profissional não bloqueia a outra e não é alterável por ela", async () => {
    const a = await makeProfessional();
    const b = await makeProfessional();
    const ra = await createPublicAppointment(a.professional.slug, booking(a.shortService.id, at("08:00"), 1), NOW);
    await expect(createPublicAppointment(b.professional.slug, booking(b.shortService.id, at("08:00"), 1), NOW)).resolves.toBeTruthy();

    // Serviço de A não pode ser usado na página de B
    await expectCode(createPublicAppointment(b.professional.slug, booking(a.shortService.id, at("09:00"), 3), NOW), "VALIDATION");

    const apptA = await prisma.appointment.findUniqueOrThrow({ where: { publicToken: ra.publicToken } });
    await expectCode(changeAppointmentStatus(b.auth, apptA.id, "CANCELADO", NOW), "NOT_FOUND");
    await expectCode(rescheduleAppointment(b.auth, apptA.id, at("15:00"), NOW), "NOT_FOUND");
    // Mesma cliente (mesmo WhatsApp) existe separadamente em cada profissional
    expect(await prisma.customer.count({ where: { whatsapp: "5571900000001" } })).toBe(2);
  });
});
