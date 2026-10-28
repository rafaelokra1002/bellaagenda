/**
 * Utilitários de data/hora com fuso explícito, sem dependências externas.
 *
 * Convenções:
 * - "LocalDate" = string "YYYY-MM-DD" no calendário da profissional.
 * - "LocalTime" = string "HH:MM" no relógio da profissional.
 * - Instantes absolutos são objetos Date (UTC).
 */

export const DEFAULT_TIMEZONE = "America/Bahia";
export const MINUTE_MS = 60_000;

const LOCAL_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const LOCAL_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isLocalDate(value: string): boolean {
  if (!LOCAL_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isLocalTime(value: string): boolean {
  return LOCAL_TIME_RE.test(value);
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(tz: string): Intl.DateTimeFormat {
  let f = partsFormatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatterCache.set(tz, f);
  }
  return f;
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function getZonedParts(date: Date, tz: string): ZonedParts {
  const out: Record<string, number> = {};
  for (const p of partsFormatter(tz).formatToParts(date)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return {
    year: out.year!,
    month: out.month!,
    day: out.day!,
    hour: out.hour! % 24,
    minute: out.minute!,
    second: out.second!,
  };
}

/** Diferença (ms) entre o relógio local do fuso e o UTC no instante dado. */
function tzOffsetMs(date: Date, tz: string): number {
  const p = getZonedParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Converte data+hora locais da profissional em instante UTC. */
export function zonedToUtc(localDate: string, localTime: string, tz: string): Date {
  const [y, mo, d] = localDate.split("-").map(Number) as [number, number, number];
  const [h, mi] = localTime.split(":").map(Number) as [number, number];
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  // Duas iterações resolvem transições de horário de verão.
  let ts = guess - tzOffsetMs(new Date(guess), tz);
  ts = guess - tzOffsetMs(new Date(ts), tz);
  return new Date(ts);
}

export function toLocalDate(date: Date, tz: string): string {
  const p = getZonedParts(date, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function toLocalTime(date: Date, tz: string): string {
  const p = getZonedParts(date, tz);
  return minutesToTime(p.hour * 60 + p.minute);
}

/** Dia da semana (0 = domingo) de uma data de calendário — independe de fuso. */
export function dayOfWeek(localDate: string): number {
  const [y, m, d] = localDate.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(localDate: string, days: number): string {
  const [y, m, d] = localDate.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Diferença em dias de calendário (b - a). */
export function diffDays(a: string, b: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number) as [number, number, number];
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

export function startOfWeek(localDate: string): string {
  // Semana começando no domingo, como no calendário brasileiro comum.
  return addDays(localDate, -dayOfWeek(localDate));
}

export function startOfMonth(localDate: string): string {
  return `${localDate.slice(0, 7)}-01`;
}

export function addMonths(localDate: string, months: number): string {
  const [y, m] = localDate.split("-").map(Number) as [number, number];
  const dt = new Date(Date.UTC(y, m - 1 + months, 1));
  return dt.toISOString().slice(0, 10);
}

/** Intervalo UTC [início, fim) que cobre os dias locais de `from` até `to` (inclusive). */
export function localRangeToUtc(from: string, to: string, tz: string): { start: Date; end: Date } {
  return { start: zonedToUtc(from, "00:00", tz), end: zonedToUtc(addDays(to, 1), "00:00", tz) };
}

// ---------- Formatação pt-BR ----------

export function formatDateBR(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function formatDateLongBR(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatTimeBR(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

export function formatDateTimeBR(date: Date, tz: string): string {
  return `${formatDateBR(date, tz)} às ${formatTimeBR(date, tz)}`;
}

/** Formata uma LocalDate sem conversão de fuso (é uma data de calendário). */
export function formatLocalDateBR(localDate: string, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" }): string {
  const [y, m, d] = localDate.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("pt-BR", { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export const WEEKDAY_NAMES = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"] as const;
export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}
