import { prisma } from "@/lib/prisma";
import { addDays, addMonths, dayOfWeek, isLocalDate, localRangeToUtc, startOfMonth, startOfWeek, toLocalDate } from "@/lib/time";
import { eachDate, periodsForDate, periodsToIntervals, subtractIntervals } from "../availability/engine";
import { toAppointmentRow, type AppointmentRow } from "../appointments/dto";

export type CalendarViewMode = "dia" | "semana" | "mes";

export interface CalendarDay {
  date: string;
  isWorkingDay: boolean;
  appointments: AppointmentRow[];
  free: Array<{ start: string; end: string }>;
  blocks: Array<{ start: string; end: string; reason: string | null }>;
}

export function resolveCalendarRange(view: CalendarViewMode, anchor: string) {
  if (view === "dia") return { from: anchor, to: anchor };
  if (view === "semana") {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 6) };
  }
  const first = startOfMonth(anchor);
  // Grade mensal completa: do domingo antes do dia 1 ao sábado depois do último dia.
  const from = startOfWeek(first);
  const last = addDays(addMonths(first, 1), -1);
  return { from, to: addDays(last, 6 - dayOfWeek(last)) };
}

export function parseCalendarParams(raw: { view?: string; date?: string }, timezone: string) {
  const view: CalendarViewMode = raw.view === "dia" || raw.view === "mes" ? raw.view : "semana";
  const date = raw.date && isLocalDate(raw.date) ? raw.date : toLocalDate(new Date(), timezone);
  return { view, date };
}

export async function getCalendar(professionalId: string, timezone: string, view: CalendarViewMode, anchor: string): Promise<CalendarDay[]> {
  const { from, to } = resolveCalendarRange(view, anchor);
  const { start, end } = localRangeToUtc(from, to, timezone);

  const [appointments, blocks, hours] = await Promise.all([
    prisma.appointment.findMany({
      where: { professionalId, startAt: { gte: start, lt: end } },
      orderBy: { startAt: "asc" },
      include: { customer: { select: { id: true, name: true, whatsapp: true } } },
    }),
    prisma.availabilityBlock.findMany({ where: { professionalId, startAt: { lt: end }, endAt: { gt: start } } }),
    prisma.businessHour.findMany({ where: { professionalId, isActive: true } }),
  ]);

  return eachDate(from, to).map((date) => {
    const dayRange = localRangeToUtc(date, date, timezone);
    const dayAppts = appointments.filter((a) => toLocalDate(a.startAt, timezone) === date);
    const dayBlocks = blocks.filter((b) => b.startAt < dayRange.end && b.endAt > dayRange.start);
    const periods = periodsForDate(hours, date);
    const busy = [
      // O passado nunca é "livre".
      { start: new Date(0), end: new Date() },
      ...dayAppts.filter((a) => a.status !== "CANCELADO").map((a) => ({ start: a.startAt, end: a.occupiedUntil })),
      ...dayBlocks.map((b) => ({ start: b.startAt, end: b.endAt })),
    ];
    const free = subtractIntervals(periodsToIntervals(date, periods, timezone), busy);
    return {
      date,
      isWorkingDay: periods.length > 0,
      appointments: dayAppts.map(toAppointmentRow),
      free: free.map((f) => ({ start: f.start.toISOString(), end: f.end.toISOString() })),
      blocks: dayBlocks.map((b) => ({ start: b.startAt.toISOString(), end: b.endAt.toISOString(), reason: b.reason })),
    };
  });
}
