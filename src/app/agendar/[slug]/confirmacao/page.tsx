import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck2, CalendarClock, MapPin, MessageCircle } from "lucide-react";
import { getPublicConfirmation } from "@/server/appointments/service";
import { formatMoney } from "@/lib/money";
import { formatDateBR, formatDateLongBR, formatTimeBR } from "@/lib/time";
import { buildWhatsappLink, customerConfirmationMessage } from "@/lib/whatsapp";
import { buttonClasses } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/misc";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Agendamento realizado", robots: { index: false } };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ codigo?: string }> };

export default async function ConfirmationPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { codigo } = await searchParams;
  const a = codigo ? await getPublicConfirmation(slug, codigo) : null;
  if (!a) notFound();

  const tz = a.professional.timezone;
  const message = customerConfirmationMessage({
    serviceName: a.serviceNameSnapshot,
    dateLabel: formatDateBR(a.startAt, tz),
    timeLabel: formatTimeBR(a.startAt, tz),
    professionalName: a.professional.name,
  });

  return (
    <main
      className="flex min-h-dvh items-start justify-center bg-[radial-gradient(100%_60%_at_50%_0%,#f8e8ec_0%,#fdf9f7_70%)] px-4 py-10 sm:items-center"
      style={a.professional.accentColor ? ({ "--accent": a.professional.accentColor } as React.CSSProperties) : undefined}
    >
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-white text-emerald-700 shadow-lift">
            <CalendarCheck2 className="size-8" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold">
            {a.status === "CANCELADO" ? "Agendamento cancelado" : `Tudo certo${a.customerFirstName ? `, ${a.customerFirstName}` : ""}!`}
          </h1>
          <p className="mt-1 text-sm text-cocoa-muted">
            {a.status === "CANCELADO" ? "Este horário foi cancelado. Fale com a profissional para remarcar." : "Seu horário foi reservado."}
          </p>
        </div>

        <div className="mt-6 rounded-3xl border border-line bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-cocoa-muted">Serviço</p>
              <p className="font-display text-2xl font-semibold leading-tight">{a.serviceNameSnapshot}</p>
            </div>
            <StatusBadge status={a.status} />
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <p className="flex items-center gap-2 capitalize">
              <CalendarClock className="size-4 text-gold-deep" /> {formatDateLongBR(a.startAt, tz)}, {formatTimeBR(a.startAt, tz)} às {formatTimeBR(a.endAt, tz)}
            </p>
            {a.professional.address && (
              <p className="flex items-center gap-2">
                <MapPin className="size-4 text-gold-deep" /> {a.professional.address}
              </p>
            )}
            <p className="flex justify-between border-t border-line pt-3">
              <span className="text-cocoa-muted">Profissional</span> <span className="font-medium">{a.professional.name}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-cocoa-muted">Valor</span> <span className="font-medium">{formatMoney(a.priceSnapshot)}</span>
            </p>
          </div>
        </div>

        {a.status !== "CANCELADO" && (
          <>
            <a href={buildWhatsappLink(a.professional.whatsapp, message)} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "lg", "mt-6 w-full")}>
              <MessageCircle className="size-5" /> Confirmar pelo WhatsApp
            </a>
            <p className="mt-2 text-center text-xs text-cocoa-muted">
              Abre o WhatsApp com a mensagem pronta. Toque em enviar para que a profissional receba.
            </p>
          </>
        )}
        <p className="mt-6 text-center text-xs text-cocoa-muted">Guarde este link para consultar seu agendamento.</p>
        <div className="mt-3 text-center">
          <Link href={`/agendar/${a.professional.slug}`} className="text-sm font-medium text-cocoa underline-offset-4 hover:underline">
            Fazer outro agendamento
          </Link>
        </div>
      </div>
    </main>
  );
}
