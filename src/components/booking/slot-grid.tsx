"use client";

import { CalendarX2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/misc";
import type { SlotOption } from "./types";

const GROUPS = [
  { label: "Manhã", test: (h: number) => h < 12 },
  { label: "Tarde", test: (h: number) => h >= 12 && h < 18 },
  { label: "Noite", test: (h: number) => h >= 18 },
];

interface Props {
  slots: SlotOption[] | null;
  loading: boolean;
  error: string | null;
  selected: string | null;
  onSelect: (slot: SlotOption) => void;
  onRetry: () => void;
}

export function SlotGrid({ slots, loading, error, selected, onSelect, onRetry }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {error}{" "}
        <button type="button" onClick={onRetry} className="font-semibold underline">
          Tentar novamente
        </button>
      </div>
    );
  }
  if (!slots) return <p className="text-sm text-cocoa-muted">Escolha uma data para ver os horários.</p>;
  if (slots.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line bg-white/70 p-4 text-sm text-cocoa-soft">
        <CalendarX2 className="size-5 shrink-0 text-gold-deep" />
        Não há horários livres neste dia para este serviço. Tente outra data.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {GROUPS.map((g) => {
        const items = slots.filter((s) => g.test(Number(s.time.slice(0, 2))));
        if (!items.length) return null;
        return (
          <div key={g.label}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-cocoa-muted">{g.label}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {items.map((s) => (
                <button
                  key={s.startAt}
                  type="button"
                  onClick={() => onSelect(s)}
                  aria-pressed={selected === s.startAt}
                  className={cn(
                    "h-11 rounded-xl border text-sm font-semibold tabular-nums transition-colors",
                    selected === s.startAt ? "border-transparent bg-[var(--accent)] text-white shadow-soft" : "border-line bg-white hover:border-gold hover:bg-blush/50",
                  )}
                >
                  {s.time}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
