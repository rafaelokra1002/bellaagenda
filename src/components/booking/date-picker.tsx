"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { addDays, addMonths, dayOfWeek, diffDays, formatLocalDateBR, startOfMonth, WEEKDAY_SHORT } from "@/lib/time";
import { cn } from "@/lib/utils";

interface Props {
  today: string;
  maxAdvanceDays: number;
  workingWeekdays: number[];
  value: string | null;
  onChange: (date: string) => void;
}

/** Calendário mensal compacto, com dias fora do expediente desabilitados. */
export function DatePicker({ today, maxAdvanceDays, workingWeekdays, value, onChange }: Props) {
  const lastDay = addDays(today, maxAdvanceDays);
  const [month, setMonth] = useState(startOfMonth(value ?? today));

  const cells = useMemo(() => {
    const first = month;
    const lead = dayOfWeek(first);
    const daysInMonth = diffDays(first, addMonths(first, 1));
    return [...Array<null>(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i))];
  }, [month]);

  const canPrev = diffDays(startOfMonth(today), month) > 0;
  const canNext = diffDays(addMonths(month, 1), lastDay) >= 0;

  return (
    <div className="rounded-2xl border border-line bg-white p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => setMonth(addMonths(month, -1))} disabled={!canPrev} className="rounded-full p-2 hover:bg-nude-soft disabled:opacity-30" aria-label="Mês anterior">
          <ChevronLeft className="size-5" />
        </button>
        <p className="font-display text-xl font-semibold capitalize" aria-live="polite">
          {formatLocalDateBR(month, { month: "long", year: "numeric" })}
        </p>
        <button type="button" onClick={() => setMonth(addMonths(month, 1))} disabled={!canNext} className="rounded-full p-2 hover:bg-nude-soft disabled:opacity-30" aria-label="Próximo mês">
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center" role="grid">
        {WEEKDAY_SHORT.map((d) => (
          <div key={d} className="pb-1 text-[11px] font-medium uppercase tracking-wide text-cocoa-muted">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const disabled = diffDays(today, d) < 0 || diffDays(d, lastDay) < 0 || !workingWeekdays.includes(dayOfWeek(d));
          const selected = d === value;
          return (
            <button
              key={d}
              type="button"
              disabled={disabled}
              onClick={() => onChange(d)}
              aria-pressed={selected}
              aria-label={formatLocalDateBR(d, { weekday: "long", day: "numeric", month: "long" })}
              className={cn(
                "mx-auto flex aspect-square w-full max-w-11 items-center justify-center rounded-full text-sm transition-colors",
                disabled && "cursor-not-allowed text-cocoa-muted/40",
                !disabled && !selected && "font-medium hover:bg-blush",
                selected && "bg-[var(--accent)] font-semibold text-white shadow-soft",
                d === today && !selected && "ring-1 ring-gold",
              )}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
