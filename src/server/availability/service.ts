import type { Professional } from "@prisma/client";
import { prisma, type Tx } from "@/lib/prisma";
import { localRangeToUtc } from "@/lib/time";
import { computeSlots, periodsForDate, type Interval, type Slot } from "./engine";

type Db = Tx | typeof prisma;

export type ScheduleOwner = Pick<Professional, "id" | "timezone" | "slotStepMinutes" | "minNoticeMinutes" | "maxAdvanceDays">;

/** Atendimentos não cancelados + bloqueios que tocam o intervalo [start, end). */
export async function loadBusyIntervals(
  db: Db,
  professionalId: string,
  start: Date,
  end: Date,
  excludeAppointmentId?: string,
): Promise<Interval[]> {
  const [appointments, blocks] = await Promise.all([
    db.appointment.findMany({
      where: {
        professionalId,
        status: { not: "CANCELADO" },
        startAt: { lt: end },
        occupiedUntil: { gt: start },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      select: { startAt: true, occupiedUntil: true },
    }),
    db.availabilityBlock.findMany({
      where: { professionalId, startAt: { lt: end }, endAt: { gt: start } },
      select: { startAt: true, endAt: true },
    }),
  ]);
  return [
    ...appointments.map((a) => ({ start: a.startAt, end: a.occupiedUntil })),
    ...blocks.map((b) => ({ start: b.startAt, end: b.endAt })),
  ];
}

export interface SlotQuery {
  professional: ScheduleOwner;
  date: string;
  durationMinutes: number;
  bufferMinutes: number;
  now?: Date;
  excludeAppointmentId?: string;
  enforceBookingWindow?: boolean;
}

/** Calcula os horários livres de um dia consultando o banco. */
export async function getAvailableSlots(db: Db, q: SlotQuery): Promise<Slot[]> {
  const { professional, date } = q;
  const hours = await db.businessHour.findMany({ where: { professionalId: professional.id, isActive: true } });
  const periods = periodsForDate(hours, date);
  if (periods.length === 0) return [];

  // Busca ocupações do dia inteiro (com folga para intervalos que atravessam a meia-noite).
  const { start, end } = localRangeToUtc(date, date, professional.timezone);
  const busy = await loadBusyIntervals(db, professional.id, new Date(start.getTime() - 86_400_000), new Date(end.getTime() + 86_400_000), q.excludeAppointmentId);

  return computeSlots({
    date,
    timezone: professional.timezone,
    periods,
    durationMinutes: q.durationMinutes,
    bufferMinutes: q.bufferMinutes,
    rules: {
      slotStepMinutes: professional.slotStepMinutes,
      minNoticeMinutes: professional.minNoticeMinutes,
      maxAdvanceDays: professional.maxAdvanceDays,
    },
    now: q.now ?? new Date(),
    busy,
    enforceBookingWindow: q.enforceBookingWindow,
  });
}

export function effectiveBuffer(serviceBuffer: number | null, professionalDefault: number): number {
  return serviceBuffer ?? professionalDefault;
}

/** Serializa os horários para o navegador. */
export function serializeSlots(slots: Slot[]) {
  return slots.map((s) => ({ time: s.time, startAt: s.startAt.toISOString() }));
}
