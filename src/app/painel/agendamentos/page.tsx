import { ListChecks } from "lucide-react";
import { requireAuth } from "@/server/auth/guard";
import { listAppointments } from "@/server/appointments/service";
import { toAppointmentRow } from "@/server/appointments/dto";
import { prisma } from "@/lib/prisma";
import { localRangeToUtc } from "@/lib/time";
import { appointmentFiltersSchema } from "@/validation/admin";
import { AppointmentFilters } from "@/components/panel/appointment-filters";
import { AppointmentList } from "@/components/panel/appointment-list";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function AppointmentsPage({ searchParams }: Props) {
  const auth = await requireAuth();
  const raw = await searchParams;
  const parsed = appointmentFiltersSchema.safeParse(Object.fromEntries(Object.entries(raw).filter(([, v]) => v)));
  const f = parsed.success ? parsed.data : { page: 1 };

  const range = "date" in f && f.date ? localRangeToUtc(f.date, f.date, auth.timezone) : null;
  const [result, services] = await Promise.all([
    listAppointments(auth.professionalId, {
      q: "q" in f ? f.q : undefined,
      serviceId: "serviceId" in f ? f.serviceId : undefined,
      status: "status" in f ? f.status : undefined,
      from: range?.start,
      to: range?.end,
      page: f.page,
    }),
    prisma.service.findMany({ where: { professionalId: auth.professionalId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="Agendamentos" description={`${result.total} ${result.total === 1 ? "registro" : "registros"} encontrados.`} />
      <AppointmentFilters services={services} />
      {result.items.length === 0 ? (
        <EmptyState icon={<ListChecks className="size-8" />} title="Nenhum agendamento encontrado">
          Ajuste os filtros ou aguarde novos agendamentos pela sua página.
        </EmptyState>
      ) : (
        <AppointmentList items={result.items.map(toAppointmentRow)} timezone={auth.timezone} professionalName={auth.professionalName} />
      )}
      <Pagination page={f.page} pageCount={result.pageCount} basePath="/painel/agendamentos" params={raw} />
    </>
  );
}
