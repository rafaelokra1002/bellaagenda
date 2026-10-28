import { prisma } from "@/lib/prisma";
import { AppError, notFound } from "@/lib/errors";
import { ACTIVE_STATUSES } from "@/lib/status";
import { formatDateTimeBR, timeToMinutes, toLocalDate, toLocalTime, zonedToUtc } from "@/lib/time";
import type { BlockValues, BusinessHoursValues, ScheduleSettingsValues } from "@/validation/admin";
import { findInvalidPeriods, periodsForDate } from "../availability/engine";

export interface ConflictItem {
  id: string;
  label: string;
}

export async function getSchedule(professionalId: string) {
  const [professional, hours, blocks] = await Promise.all([
    prisma.professional.findUniqueOrThrow({ where: { id: professionalId } }),
    prisma.businessHour.findMany({ where: { professionalId }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] }),
    prisma.availabilityBlock.findMany({ where: { professionalId, endAt: { gt: new Date() } }, orderBy: { startAt: "asc" } }),
  ]);
  return { professional, hours, blocks };
}

/** Atendimentos futuros em aberto que não cabem mais no novo expediente. */
async function appointmentsOutsideHours(professionalId: string, timezone: string, now: Date): Promise<ConflictItem[]> {
  const [hours, upcoming] = await Promise.all([
    prisma.businessHour.findMany({ where: { professionalId, isActive: true } }),
    prisma.appointment.findMany({
      where: { professionalId, status: { in: ACTIVE_STATUSES }, startAt: { gt: now } },
      include: { customer: { select: { name: true } } },
      orderBy: { startAt: "asc" },
    }),
  ]);
  return upcoming
    .filter((a) => {
      const date = toLocalDate(a.startAt, timezone);
      const start = timeToMinutes(toLocalTime(a.startAt, timezone));
      const durationMin = Math.round((a.endAt.getTime() - a.startAt.getTime()) / 60_000);
      return !periodsForDate(hours, date).some((p) => start >= timeToMinutes(p.startTime) && start + durationMin <= timeToMinutes(p.endTime));
    })
    .map((a) => ({ id: a.id, label: `${formatDateTimeBR(a.startAt, timezone)} — ${a.customer.name} (${a.serviceNameSnapshot})` }));
}

export async function saveBusinessHours(professionalId: string, v: BusinessHoursValues, now = new Date()) {
  const problem = findInvalidPeriods(v.periods);
  if (problem) throw new AppError("VALIDATION", problem);
  const professional = await prisma.professional.findUniqueOrThrow({ where: { id: professionalId }, select: { timezone: true } });
  await prisma.$transaction([
    prisma.businessHour.deleteMany({ where: { professionalId } }),
    prisma.businessHour.createMany({ data: v.periods.map((p) => ({ ...p, professionalId, isActive: true })) }),
  ]);
  // Agendamentos existentes são preservados; apenas avisamos.
  return { conflicts: await appointmentsOutsideHours(professionalId, professional.timezone, now) };
}

export async function saveScheduleSettings(professionalId: string, v: ScheduleSettingsValues) {
  await prisma.professional.update({ where: { id: professionalId }, data: v });
}

function blockRange(v: BlockValues, timezone: string) {
  const startAt = zonedToUtc(v.startDate, v.startTime, timezone);
  const endAt = zonedToUtc(v.endDate, v.endTime, timezone);
  if (endAt.getTime() <= startAt.getTime()) throw new AppError("VALIDATION", "O fim do bloqueio deve ser depois do início.");
  if (endAt.getTime() - startAt.getTime() > 400 * 86_400_000) throw new AppError("VALIDATION", "Bloqueio muito longo (máximo de 400 dias).");
  return { startAt, endAt };
}

export async function createBlock(professionalId: string, v: BlockValues) {
  const professional = await prisma.professional.findUniqueOrThrow({ where: { id: professionalId }, select: { timezone: true } });
  const { startAt, endAt } = blockRange(v, professional.timezone);
  const overlapping = await prisma.appointment.findMany({
    where: { professionalId, status: { in: ACTIVE_STATUSES }, startAt: { lt: endAt }, occupiedUntil: { gt: startAt } },
    include: { customer: { select: { name: true } } },
    orderBy: { startAt: "asc" },
  });
  const conflicts = overlapping.map((a) => ({ id: a.id, label: `${formatDateTimeBR(a.startAt, professional.timezone)} — ${a.customer.name} (${a.serviceNameSnapshot})` }));
  if (conflicts.length && !v.force) {
    throw new AppError("CONFLICT", "Existem atendimentos marcados neste período.", { conflicts });
  }
  const block = await prisma.availabilityBlock.create({ data: { professionalId, startAt, endAt, reason: v.reason?.trim() || null } });
  return { block, conflicts };
}

export async function deleteBlock(professionalId: string, id: string) {
  const { count } = await prisma.availabilityBlock.deleteMany({ where: { id, professionalId } });
  if (count === 0) throw notFound("Bloqueio");
}
