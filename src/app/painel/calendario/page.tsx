import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireAuth } from "@/server/auth/guard";
import { getCalendar, parseCalendarParams, resolveCalendarRange, type CalendarViewMode } from "@/server/calendar/service";
import { addDays, addMonths, formatLocalDateBR, toLocalDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { CalendarView } from "@/components/panel/calendar-view";
import { PageHeader } from "@/components/ui/misc";

type Props = { searchParams: Promise<{ view?: string; date?: string }> };

const VIEWS: Array<{ id: CalendarViewMode; label: string }> = [
  { id: "dia", label: "Dia" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
];

function shift(view: CalendarViewMode, date: string, dir: 1 | -1) {
  if (view === "dia") return addDays(date, dir);
  if (view === "semana") return addDays(date, 7 * dir);
  return addMonths(date, dir);
}

function title(view: CalendarViewMode, date: string) {
  if (view === "dia") return formatLocalDateBR(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (view === "mes") return formatLocalDateBR(date, { month: "long", year: "numeric" });
  const { from, to } = resolveCalendarRange("semana", date);
  return `${formatLocalDateBR(from, { day: "2-digit", month: "short" })} – ${formatLocalDateBR(to, { day: "2-digit", month: "short", year: "numeric" })}`;
}

export default async function CalendarPage({ searchParams }: Props) {
  const auth = await requireAuth();
  const { view, date } = parseCalendarParams(await searchParams, auth.timezone);
  const today = toLocalDate(new Date(), auth.timezone);
  const days = await getCalendar(auth.professionalId, auth.timezone, view, date);
  const href = (v: CalendarViewMode, d: string) => `/painel/calendario?view=${v}&date=${d}`;
  const navBtn = "inline-flex size-10 items-center justify-center rounded-full border border-line bg-white hover:bg-nude-soft";

  return (
    <>
      <PageHeader title="Calendário" />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link href={href(view, shift(view, date, -1))} className={navBtn} aria-label="Período anterior">
            <ChevronLeft className="size-5" />
          </Link>
          <Link href={href(view, today)} className="inline-flex h-10 items-center rounded-full border border-line bg-white px-4 text-sm hover:bg-nude-soft">
            Hoje
          </Link>
          <Link href={href(view, shift(view, date, 1))} className={navBtn} aria-label="Próximo período">
            <ChevronRight className="size-5" />
          </Link>
          <p className="ml-2 font-display text-xl font-semibold capitalize">{title(view, date)}</p>
        </div>
        <div className="inline-flex self-start rounded-full border border-line bg-white p-1" role="tablist">
          {VIEWS.map((v) => (
            <Link
              key={v.id}
              href={href(v.id, date)}
              role="tab"
              aria-selected={v.id === view}
              className={cn("rounded-full px-4 py-1.5 text-sm", v.id === view ? "bg-cocoa text-white" : "text-cocoa-soft hover:bg-nude-soft")}
            >
              {v.label}
            </Link>
          ))}
        </div>
      </div>
      <CalendarView view={view} anchor={date} today={today} days={days} timezone={auth.timezone} professionalName={auth.professionalName} />
    </>
  );
}
