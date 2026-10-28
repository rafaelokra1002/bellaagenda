import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { requireAuth } from "@/server/auth/guard";
import { getCustomer } from "@/server/customers/service";
import { toAppointmentRow } from "@/server/appointments/dto";
import { AppError } from "@/lib/errors";
import { decimalToCents, formatCents } from "@/lib/money";
import { formatWhatsapp } from "@/lib/phone";
import { formatDateBR } from "@/lib/time";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { AppointmentList } from "@/components/panel/appointment-list";
import { AnonymizeButton } from "@/components/panel/anonymize-button";
import { buttonClasses } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/misc";

type Props = { params: Promise<{ id: string }> };

export default async function CustomerPage({ params }: Props) {
  const auth = await requireAuth();
  const { id } = await params;
  const customer = await getCustomer(auth.professionalId, id).catch((e: unknown) => {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  const tz = auth.timezone;
  const completed = customer.appointments.filter((a) => a.status === "CONCLUIDO");
  const spent = completed.reduce((sum, a) => sum + decimalToCents(a.priceSnapshot), 0);
  const first = customer.appointments.at(-1);
  const anonymized = !!customer.anonymizedAt;

  return (
    <>
      <Link href="/painel/clientes" className="mb-4 inline-flex items-center gap-1 text-sm text-cocoa-muted hover:text-cocoa">
        <ArrowLeft className="size-4" /> Clientes
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">{customer.name}</h1>
          {!anonymized && <p className="text-sm text-cocoa-muted">{formatWhatsapp(customer.whatsapp)}</p>}
        </div>
        {!anonymized && (
          <div className="flex gap-2">
            <a href={buildWhatsappLink(customer.whatsapp)} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "sm")}>
              <MessageCircle className="size-4" /> Abrir conversa
            </a>
            <AnonymizeButton customerId={customer.id} />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Primeiro agendamento", value: first ? formatDateBR(first.startAt, tz) : "—" },
          { label: "Último atendimento", value: completed[0] ? formatDateBR(completed[0].startAt, tz) : "—" },
          { label: "Atendimentos concluídos", value: String(completed.length) },
          { label: "Total gasto", value: formatCents(spent) },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs uppercase tracking-wider text-cocoa-muted">{s.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>
      <h2 className="mb-3 mt-8 font-display text-2xl font-semibold">Histórico</h2>
      {customer.appointments.length === 0 ? (
        <EmptyState title="Sem agendamentos" />
      ) : (
        <AppointmentList
          items={customer.appointments.map((a) => toAppointmentRow({ ...a, customer: { id: customer.id, name: customer.name, whatsapp: customer.whatsapp } }))}
          timezone={tz}
          professionalName={auth.professionalName}
        />
      )}
    </>
  );
}
