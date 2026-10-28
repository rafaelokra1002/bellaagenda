/**
 * Regras de agendamento. Proteção contra concorrência em três camadas:
 * 1. Lock consultivo transacional por profissional (pg_advisory_xact_lock):
 *    reservas simultâneas da mesma profissional são serializadas.
 * 2. Dentro do lock, a disponibilidade é recalculada do zero no servidor.
 * 3. Restrição EXCLUDE no banco impede sobreposição mesmo se algo escapar.
 */
import { randomBytes } from "node:crypto";
import { Prisma, type AppointmentStatus } from "@prisma/client";
import { prisma, type Tx } from "@/lib/prisma";
import { AppError, notFound } from "@/lib/errors";
import { normalizeWhatsapp } from "@/lib/phone";
import { MINUTE_MS, toLocalDate } from "@/lib/time";
import { ACTIVE_STATUSES, canReschedule, canTransition, requiresStarted, STATUS_LABEL } from "@/lib/status";
import type { PublicBookingInput } from "@/validation/booking";
import { effectiveBuffer, getAvailableSlots } from "../availability/service";
import { findSlot } from "../availability/engine";

/** Máximo de atendimentos futuros em aberto por WhatsApp (anti-abuso). */
export const MAX_OPEN_APPOINTMENTS_PER_CUSTOMER = 3;

export async function lockProfessionalSchedule(tx: Tx, professionalId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${professionalId}, 0))`;
}

const TX_OPTIONS = { timeout: 10_000, maxWait: 10_000 } as const;

// ---------------------------------------------------------------------------
// Página pública
// ---------------------------------------------------------------------------

export async function createPublicAppointment(slug: string, input: PublicBookingInput, now = new Date()): Promise<{ publicToken: string }> {
  const professional = await prisma.professional.findFirst({ where: { slug, isActive: true } });
  if (!professional) throw notFound("Profissional");

  const service = await prisma.service.findFirst({ where: { id: input.serviceId, professionalId: professional.id, isActive: true } });
  if (!service) throw new AppError("VALIDATION", "Este serviço não está disponível para agendamento.");

  const whatsapp = normalizeWhatsapp(input.whatsapp);
  if (!whatsapp) throw new AppError("VALIDATION", "WhatsApp inválido.");

  const startAt = new Date(input.startAt);
  const date = toLocalDate(startAt, professional.timezone);
  const buffer = effectiveBuffer(service.bufferMinutes, professional.defaultBufferMinutes);

  return prisma.$transaction(async (tx) => {
    await lockProfessionalSchedule(tx, professional.id);

    const existing = await tx.customer.findUnique({ where: { professionalId_whatsapp: { professionalId: professional.id, whatsapp } } });
    if (existing) {
      const open = await tx.appointment.count({
        where: { customerId: existing.id, status: { in: ACTIVE_STATUSES }, startAt: { gt: now } },
      });
      if (open >= MAX_OPEN_APPOINTMENTS_PER_CUSTOMER) {
        throw new AppError("CONFLICT", "Você já possui agendamentos em aberto. Fale com a profissional pelo WhatsApp para marcar outro.");
      }
    }

    const slots = await getAvailableSlots(tx, { professional, date, durationMinutes: service.durationMinutes, bufferMinutes: buffer, now });
    const slot = findSlot(slots, startAt);
    if (!slot) throw new AppError("SLOT_UNAVAILABLE", "Este horário não está mais disponível. Escolha outro horário.");

    // Não sobrescrevemos o nome de uma cliente existente a partir da página pública.
    const customer =
      existing ??
      (await tx.customer.create({ data: { professionalId: professional.id, name: input.name.trim(), whatsapp, consentAt: now } }));
    if (existing && !existing.consentAt) await tx.customer.update({ where: { id: existing.id }, data: { consentAt: now } });

    const publicToken = randomBytes(18).toString("base64url");
    const appointment = await tx.appointment.create({
      data: {
        professionalId: professional.id,
        serviceId: service.id,
        customerId: customer.id,
        startAt: slot.startAt,
        endAt: slot.endAt,
        occupiedUntil: slot.occupiedUntil,
        serviceNameSnapshot: service.name,
        priceSnapshot: service.price,
        customerNotes: input.notes?.trim() || null,
        publicToken,
      },
    });
    await tx.appointmentAudit.create({ data: { appointmentId: appointment.id, action: "CRIADO", newStatus: "PENDENTE", newStartAt: slot.startAt } });
    return { publicToken };
  }, TX_OPTIONS);
}

export async function getPublicConfirmation(slug: string, token: string) {
  if (!/^[A-Za-z0-9_-]{10,60}$/.test(token)) return null;
  const appt = await prisma.appointment.findFirst({
    where: { publicToken: token, professional: { slug } },
    select: {
      startAt: true,
      endAt: true,
      status: true,
      serviceNameSnapshot: true,
      priceSnapshot: true,
      customer: { select: { name: true } },
      professional: { select: { name: true, whatsapp: true, timezone: true, address: true, slug: true, photoUrl: true, accentColor: true } },
    },
  });
  if (!appt) return null;
  return {
    ...appt,
    // Somente o primeiro nome: a página é acessível a quem tiver o link.
    customerFirstName: appt.customer.name.split(" ")[0] ?? "",
  };
}

// ---------------------------------------------------------------------------
// Painel
// ---------------------------------------------------------------------------

async function loadOwned(tx: Tx, professionalId: string, id: string) {
  const appt = await tx.appointment.findFirst({ where: { id, professionalId } });
  if (!appt) throw notFound("Agendamento");
  return appt;
}

export async function changeAppointmentStatus(
  auth: { professionalId: string; userId: string },
  id: string,
  to: AppointmentStatus,
  now = new Date(),
) {
  return prisma.$transaction(async (tx) => {
    await lockProfessionalSchedule(tx, auth.professionalId);
    const appt = await loadOwned(tx, auth.professionalId, id);
    if (appt.status === to) return appt;
    if (!canTransition(appt.status, to)) {
      throw new AppError("INVALID_TRANSITION", `Não é possível mudar de "${STATUS_LABEL[appt.status]}" para "${STATUS_LABEL[to]}".`);
    }
    if (requiresStarted(to) && appt.startAt.getTime() > now.getTime()) {
      throw new AppError("INVALID_TRANSITION", `Só é possível marcar como "${STATUS_LABEL[to]}" após o horário do atendimento.`);
    }
    const updated = await tx.appointment.update({
      where: { id: appt.id },
      data: { status: to, cancelledAt: to === "CANCELADO" ? now : null },
    });
    await tx.appointmentAudit.create({
      data: { appointmentId: appt.id, action: "STATUS_ALTERADO", previousStatus: appt.status, newStatus: to, changedByUserId: auth.userId },
    });
    return updated;
  }, TX_OPTIONS);
}

export async function rescheduleAppointment(
  auth: { professionalId: string; userId: string },
  id: string,
  newStart: Date,
  now = new Date(),
) {
  return prisma.$transaction(async (tx) => {
    await lockProfessionalSchedule(tx, auth.professionalId);
    const appt = await loadOwned(tx, auth.professionalId, id);
    if (!canReschedule(appt.status)) {
      throw new AppError("INVALID_TRANSITION", `Atendimentos com status "${STATUS_LABEL[appt.status]}" não podem ser remarcados.`);
    }
    const professional = await tx.professional.findUniqueOrThrow({ where: { id: auth.professionalId } });
    const { durationMinutes, bufferMinutes } = appointmentDurations(appt);
    const slots = await getAvailableSlots(tx, {
      professional,
      date: toLocalDate(newStart, professional.timezone),
      durationMinutes,
      bufferMinutes,
      now,
      excludeAppointmentId: appt.id,
      enforceBookingWindow: false,
    });
    const slot = findSlot(slots, newStart);
    if (!slot) throw new AppError("SLOT_UNAVAILABLE", "Este horário não está disponível. Escolha outro.");

    const updated = await tx.appointment.update({
      where: { id: appt.id },
      data: { startAt: slot.startAt, endAt: slot.endAt, occupiedUntil: slot.occupiedUntil },
    });
    await tx.appointmentAudit.create({
      data: {
        appointmentId: appt.id,
        action: "REMARCADO",
        previousStatus: appt.status,
        newStatus: appt.status,
        previousStartAt: appt.startAt,
        newStartAt: slot.startAt,
        changedByUserId: auth.userId,
      },
    });
    return updated;
  }, TX_OPTIONS);
}

/** Duração e intervalo vêm do próprio registro: mudar o serviço depois não altera atendimentos já marcados. */
export function appointmentDurations(appt: { startAt: Date; endAt: Date; occupiedUntil: Date }) {
  return {
    durationMinutes: Math.round((appt.endAt.getTime() - appt.startAt.getTime()) / MINUTE_MS),
    bufferMinutes: Math.round((appt.occupiedUntil.getTime() - appt.endAt.getTime()) / MINUTE_MS),
  };
}

export async function getAppointmentForAdmin(professionalId: string, id: string) {
  const appt = await prisma.appointment.findFirst({
    where: { id, professionalId },
    include: {
      customer: { select: { id: true, name: true, whatsapp: true } },
      audits: { orderBy: { createdAt: "asc" }, include: {} },
    },
  });
  if (!appt) throw notFound("Agendamento");
  const userIds = [...new Set(appt.audits.map((a) => a.changedByUserId).filter((v): v is string => !!v))];
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
  const names = new Map(users.map((u) => [u.id, u.name]));
  return {
    ...appt,
    audits: appt.audits.map((a) => ({ ...a, changedByName: a.changedByUserId ? (names.get(a.changedByUserId) ?? "Painel") : "Cliente (página pública)" })),
  };
}

export const ADMIN_PAGE_SIZE = 20;

export interface AppointmentFilters {
  q?: string;
  from?: Date;
  to?: Date;
  serviceId?: string;
  status?: AppointmentStatus;
  page: number;
}

export async function listAppointments(professionalId: string, f: AppointmentFilters) {
  const where: Prisma.AppointmentWhereInput = { professionalId };
  if (f.serviceId) where.serviceId = f.serviceId;
  if (f.status) where.status = f.status;
  if (f.from || f.to) where.startAt = { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lt: f.to } : {}) };
  if (f.q) {
    const digits = f.q.replace(/\D/g, "");
    where.customer = {
      OR: [{ name: { contains: f.q, mode: "insensitive" } }, ...(digits.length >= 3 ? [{ whatsapp: { contains: digits } }] : [])],
    };
  }
  const [total, items] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy: { startAt: f.from || f.status ? "asc" : "desc" },
      skip: (f.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: { customer: { select: { id: true, name: true, whatsapp: true } } },
    }),
  ]);
  return { total, items, pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}
