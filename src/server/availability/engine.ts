/**
 * Motor de disponibilidade — funções puras, sem acesso a banco.
 *
 * Regras:
 * - Um horário candidato nasce no início de cada período de expediente e
 *   avança de `slotStepMinutes` em `slotStepMinutes`.
 * - O intervalo ocupado é [início, início + duração + intervalo adicional) e
 *   precisa caber inteiro dentro do período (nunca ultrapassa o expediente).
 * - Conflita com um intervalo ocupado X quando início < X.fim e fimOcupado > X.início.
 * - Ocupam a agenda: atendimentos não cancelados e bloqueios (folgas/férias).
 * - Para a cliente: respeita antecedência mínima e limite de dias futuros.
 */
import { addDays, dayOfWeek, diffDays, MINUTE_MS, minutesToTime, timeToMinutes, toLocalDate, zonedToUtc } from "@/lib/time";

export interface Interval {
  start: Date;
  end: Date;
}

export interface Period {
  startTime: string; // "HH:MM"
  endTime: string;
}

export interface BusinessHourLike extends Period {
  dayOfWeek: number;
  isActive: boolean;
}

export interface BookingRules {
  slotStepMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
}

export interface Slot {
  time: string; // "HH:MM" local
  startAt: Date;
  endAt: Date;
  occupiedUntil: Date;
}

export interface ComputeSlotsInput {
  date: string; // "YYYY-MM-DD" local
  timezone: string;
  periods: Period[];
  durationMinutes: number;
  bufferMinutes: number;
  rules: BookingRules;
  now: Date;
  busy: Interval[];
  /** false no painel (remarcação): ignora antecedência mínima e limite futuro, mas nunca permite passado. */
  enforceBookingWindow?: boolean;
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

export function periodsForDate(hours: BusinessHourLike[], date: string): Period[] {
  const dow = dayOfWeek(date);
  return hours
    .filter((h) => h.isActive && h.dayOfWeek === dow)
    .map(({ startTime, endTime }) => ({ startTime, endTime }))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

export function isWithinBookingWindow(date: string, now: Date, timezone: string, maxAdvanceDays: number): boolean {
  const offset = diffDays(toLocalDate(now, timezone), date);
  return offset >= 0 && offset <= maxAdvanceDays;
}

export function computeSlots(input: ComputeSlotsInput): Slot[] {
  const { date, timezone, periods, durationMinutes, bufferMinutes, rules, now, busy } = input;
  const enforce = input.enforceBookingWindow ?? true;

  if (durationMinutes <= 0 || rules.slotStepMinutes <= 0) return [];
  const today = toLocalDate(now, timezone);
  const offset = diffDays(today, date);
  if (offset < 0) return [];
  if (enforce && offset > rules.maxAdvanceDays) return [];

  const earliest = now.getTime() + (enforce ? rules.minNoticeMinutes * MINUTE_MS : 0);
  const occupiedMinutes = durationMinutes + Math.max(0, bufferMinutes);
  const seen = new Set<number>();
  const slots: Slot[] = [];

  for (const period of periods) {
    const pStart = timeToMinutes(period.startTime);
    const pEnd = timeToMinutes(period.endTime);
    for (let m = pStart; m + occupiedMinutes <= pEnd; m += rules.slotStepMinutes) {
      const startAt = zonedToUtc(date, minutesToTime(m), timezone);
      const t = startAt.getTime();
      if (seen.has(t) || t < earliest) continue;
      const endAt = new Date(t + durationMinutes * MINUTE_MS);
      const occupiedUntil = new Date(t + occupiedMinutes * MINUTE_MS);
      if (busy.some((b) => overlaps(startAt, occupiedUntil, b.start, b.end))) continue;
      seen.add(t);
      slots.push({ time: minutesToTime(m), startAt, endAt, occupiedUntil });
    }
  }
  return slots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

export function findSlot(slots: Slot[], startAt: Date): Slot | undefined {
  return slots.find((s) => s.startAt.getTime() === startAt.getTime());
}

/** Intervalos de expediente de um dia como instantes UTC. */
export function periodsToIntervals(date: string, periods: Period[], timezone: string): Interval[] {
  return periods.map((p) => ({ start: zonedToUtc(date, p.startTime, timezone), end: zonedToUtc(date, p.endTime, timezone) }));
}

/** base − busy: trechos livres (usado no calendário do painel). */
export function subtractIntervals(base: Interval[], busy: Interval[]): Interval[] {
  const sortedBusy = [...busy].sort((a, b) => a.start.getTime() - b.start.getTime());
  const result: Interval[] = [];
  for (const b of base) {
    let cursor = b.start.getTime();
    const end = b.end.getTime();
    for (const x of sortedBusy) {
      const xs = x.start.getTime();
      const xe = x.end.getTime();
      if (xe <= cursor || xs >= end) continue;
      if (xs > cursor) result.push({ start: new Date(cursor), end: new Date(xs) });
      cursor = Math.max(cursor, xe);
      if (cursor >= end) break;
    }
    if (cursor < end) result.push({ start: new Date(cursor), end: new Date(end) });
  }
  return result;
}

/** Valida que os períodos de cada dia não se sobrepõem e têm início < fim. */
export function findInvalidPeriods(hours: Array<Pick<BusinessHourLike, "dayOfWeek" | "startTime" | "endTime">>): string | null {
  for (let dow = 0; dow <= 6; dow++) {
    const day = hours
      .filter((h) => h.dayOfWeek === dow)
      .map((h) => [timeToMinutes(h.startTime), timeToMinutes(h.endTime)] as const)
      .sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < day.length; i++) {
      const [s, e] = day[i]!;
      if (e <= s) return `Período inválido (${minutesToTime(s)}–${minutesToTime(e)}): o fim deve ser depois do início.`;
      const next = day[i + 1];
      if (next && next[0] < e) return `Os períodos ${minutesToTime(s)}–${minutesToTime(e)} e ${minutesToTime(next[0])}–${minutesToTime(next[1])} se sobrepõem.`;
    }
  }
  return null;
}

/** Datas locais de `from` até `to` inclusive. */
export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; diffDays(d, to) >= 0; d = addDays(d, 1)) out.push(d);
  return out;
}
