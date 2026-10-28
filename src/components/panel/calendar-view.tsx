"use client";

import Link from "next/link";
import { Ban, Clock } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/status";
import { formatDuration, formatLocalDateBR, formatTimeBR, WEEKDAY_SHORT } from "@/lib/time";
import type { AppointmentRow } from "@/server/appointments/dto";
import type { CalendarDay, CalendarViewMode } from "@/server/calendar/service";
import { AppointmentDialog } from "./appointment-dialog";

const CHIP: Record<AppointmentRow["status"], string> = {
  PENDENTE: "border-l-amber-400 bg-amber-50",
  CONFIRMADO: "border-l-emerald-500 bg-emerald-50",
  CONCLUIDO: "border-l-sky-400 bg-sky-50",
  CANCELADO: "border-l-stone-300 bg-stone-50 line-through opacity-60",
  NAO_COMPARECEU: "border-l-rose-400 bg-rose-50",
};
const DOT: Record<AppointmentRow["status"], string> = {
  PENDENTE: "bg-amber-400",
  CONFIRMADO: "bg-emerald-500",
  CONCLUIDO: "bg-sky-400",
  CANCELADO: "bg-stone-300",
  NAO_COMPARECEU: "bg-rose-400",
};

interface Props {
  view: CalendarViewMode;
  anchor: string;
  today: string;
  days: CalendarDay[];
  timezone: string;
  professionalName: string;
}

const minutesBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000);

export function CalendarView({ view, anchor, today, days, timezone, professionalName }: Props) {
  const [open, setOpen] = useState<AppointmentRow | null>(null);
  const t = (iso: string) => formatTimeBR(new Date(iso), timezone);
  const dayHref = (date: string) => `/painel/calendario?view=dia&date=${date}`;

  const chip = (a: AppointmentRow, compact = false) => (
    <button
      key={a.id}
      type="button"
      onClick={() => setOpen(a)}
      className={cn("w-full rounded-lg border-l-4 px-2 py-1.5 text-left text-xs transition-shadow hover:shadow-soft", CHIP[a.status])}
      title={`${a.customer.name} — ${a.serviceName} (${STATUS_LABEL[a.status]})`}
    >
      <span className="font-semibold tabular-nums">{t(a.startAt)}</span> <span className="font-medium">{a.customer.name.split(" ")[0]}</span>
      {!compact && <span className="block truncate text-cocoa-muted">{a.serviceName}</span>}
    </button>
  );

  let body: React.ReactNode;

  if (view === "dia") {
    const day = days[0]!;
    type Item = { kind: "appt"; at: string; a: AppointmentRow } | { kind: "free" | "block"; at: string; end: string; reason?: string | null };
    const items: Item[] = [
      ...day.appointments.map((a) => ({ kind: "appt" as const, at: a.startAt, a })),
      ...day.free.map((f) => ({ kind: "free" as const, at: f.start, end: f.end })),
      ...day.blocks.map((b) => ({ kind: "block" as const, at: b.start, end: b.end, reason: b.reason })),
    ].sort((x, y) => x.at.localeCompare(y.at));

    body = !day.isWorkingDay && items.length === 0 ? (
      <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-cocoa-muted">Dia sem expediente configurado.</p>
    ) : (
      <ol className="space-y-2">
        {items.map((it, i) => {
          if (it.kind === "appt") {
            const a = it.a;
            return (
              <li key={a.id}>
                <button type="button" onClick={() => setOpen(a)} className={cn("flex w-full items-center gap-4 rounded-2xl border-l-4 px-4 py-3 text-left shadow-soft", CHIP[a.status])}>
                  <span className="w-24 shrink-0 font-display text-lg font-semibold tabular-nums">
                    {t(a.startAt)}–{t(a.endAt)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.customer.name}</span>
                    <span className="block truncate text-sm text-cocoa-muted">{a.serviceName}</span>
                  </span>
                  <span className="hidden text-xs font-medium sm:block">{STATUS_LABEL[a.status]}</span>
                </button>
              </li>
            );
          }
          if (it.kind === "block") {
            return (
              <li key={`b${i}`} className="flex items-center gap-4 rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
                <Ban className="size-4" /> Bloqueado {t(it.at)}–{t(it.end)} {it.reason && `· ${it.reason}`}
              </li>
            );
          }
          return (
            <li key={`f${i}`} className="flex items-center gap-4 rounded-2xl border border-dashed border-line px-4 py-2.5 text-sm text-cocoa-muted">
              <Clock className="size-4 text-gold-deep" /> Livre {t(it.at)}–{t(it.end)} <span className="text-xs">({formatDuration(minutesBetween(it.at, it.end))})</span>
            </li>
          );
        })}
      </ol>
    );
  } else if (view === "semana") {
    body = (
      <div className="grid gap-3 md:grid-cols-7 md:gap-2">
        {days.map((d) => {
          const freeMin = d.free.reduce((s, f) => s + minutesBetween(f.start, f.end), 0);
          return (
            <div key={d.date} className={cn("rounded-2xl border bg-white p-2.5", d.date === today ? "border-gold ring-1 ring-gold/40" : "border-line", !d.isWorkingDay && "bg-cream")}>
              <Link href={dayHref(d.date)} className="mb-2 flex items-baseline justify-between px-1 hover:text-gold-deep md:block">
                <span className="text-xs font-medium uppercase tracking-wider text-cocoa-muted">{WEEKDAY_SHORT[new Date(`${d.date}T12:00:00Z`).getUTCDay()]}</span>
                <span className="font-display text-xl font-semibold md:block">{formatLocalDateBR(d.date, { day: "2-digit", month: "2-digit" })}</span>
              </Link>
              <div className="space-y-1.5">
                {d.appointments.map((a) => chip(a))}
                {d.blocks.length > 0 && <p className="rounded-lg bg-stone-100 px-2 py-1 text-[11px] text-stone-600">Bloqueio</p>}
                {d.isWorkingDay ? (
                  <p className="px-1 text-[11px] text-cocoa-muted">{freeMin > 0 ? `${formatDuration(freeMin)} livres` : "Sem horários livres"}</p>
                ) : (
                  d.appointments.length === 0 && <p className="px-1 text-[11px] text-cocoa-muted">Folga</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  } else {
    const month = anchor.slice(0, 7);
    body = (
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="grid grid-cols-7 border-b border-line bg-cream text-center text-[11px] font-medium uppercase tracking-wider text-cocoa-muted">
          {WEEKDAY_SHORT.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const active = d.appointments.filter((a) => a.status !== "CANCELADO");
            const inMonth = d.date.startsWith(month);
            return (
              <Link
                key={d.date}
                href={dayHref(d.date)}
                className={cn("min-h-16 border-b border-r border-line p-1.5 text-left transition-colors hover:bg-blush/40 sm:min-h-24 sm:p-2", !inMonth && "bg-cream/60 text-cocoa-muted/50")}
              >
                <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs font-medium sm:text-sm", d.date === today && "bg-cocoa text-white")}>
                  {Number(d.date.slice(8))}
                </span>
                {active.length > 0 && (
                  <>
                    <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                      {active.slice(0, 4).map((a) => (
                        <span key={a.id} className={cn("size-1.5 rounded-full", DOT[a.status])} />
                      ))}
                    </div>
                    <p className="mt-1 hidden text-xs text-cocoa-soft sm:block">
                      {active.length} {active.length === 1 ? "atendimento" : "atendimentos"}
                    </p>
                  </>
                )}
                {d.blocks.length > 0 && <p className="mt-0.5 hidden text-[10px] text-stone-500 sm:block">Bloqueio</p>}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      {body}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-cocoa-muted">
        {(Object.keys(DOT) as Array<AppointmentRow["status"]>).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", DOT[s])} /> {STATUS_LABEL[s]}
          </span>
        ))}
      </div>
      {open && <AppointmentDialog appointment={open} timezone={timezone} professionalName={professionalName} onClose={() => setOpen(null)} />}
    </>
  );
}
