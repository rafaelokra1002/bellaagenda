"use client";

import { ChevronRight, MessageCircle } from "lucide-react";
import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { formatWhatsapp } from "@/lib/phone";
import { dayOfWeek, formatDateBR, formatTimeBR, toLocalDate, WEEKDAY_SHORT } from "@/lib/time";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import type { AppointmentRow } from "@/server/appointments/dto";
import { StatusBadge } from "@/components/ui/misc";
import { AppointmentDialog } from "./appointment-dialog";

interface Props {
  items: AppointmentRow[];
  timezone: string;
  professionalName: string;
  showDate?: boolean;
}

export function AppointmentList({ items, timezone, professionalName, showDate = true }: Props) {
  const [open, setOpen] = useState<AppointmentRow | null>(null);

  return (
    <>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        {items.map((a) => {
          const start = new Date(a.startAt);
          const weekday = WEEKDAY_SHORT[dayOfWeek(toLocalDate(start, timezone))];
          const anonymized = a.customer.whatsapp.startsWith("anon-");
          return (
            <li key={a.id} className={cn("flex items-center gap-3 px-4 py-3 transition-colors hover:bg-cream", a.status === "CANCELADO" && "opacity-60")}>
              <button type="button" onClick={() => setOpen(a)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                <div className="w-16 shrink-0 text-center">
                  <p className="font-display text-xl font-semibold tabular-nums leading-none">{formatTimeBR(start, timezone)}</p>
                  {showDate && (
                    <p className="mt-1 text-[11px] text-cocoa-muted">
                      {weekday} {formatDateBR(start, timezone).slice(0, 5)}
                    </p>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.customer.name}</p>
                  <p className="truncate text-sm text-cocoa-muted">
                    {a.serviceName} · {formatMoney(a.price)}
                  </p>
                  <p className="text-xs text-cocoa-muted sm:hidden">{anonymized ? "" : formatWhatsapp(a.customer.whatsapp)}</p>
                </div>
                <span className="hidden text-sm text-cocoa-muted md:block">{anonymized ? "" : formatWhatsapp(a.customer.whatsapp)}</span>
                <StatusBadge status={a.status} className="hidden sm:inline-flex" />
              </button>
              {!anonymized && (
                <a
                  href={buildWhatsappLink(a.customer.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full p-2 text-[#1f8f4e] hover:bg-emerald-50"
                  aria-label={`Abrir conversa com ${a.customer.name} no WhatsApp`}
                >
                  <MessageCircle className="size-5" />
                </a>
              )}
              <button type="button" onClick={() => setOpen(a)} className="rounded-full p-1 text-cocoa-muted hover:bg-nude-soft" aria-label="Ver detalhes e ações">
                <ChevronRight className="size-5" />
              </button>
            </li>
          );
        })}
      </ul>
      {open && <AppointmentDialog appointment={open} timezone={timezone} professionalName={professionalName} onClose={() => setOpen(null)} />}
    </>
  );
}
