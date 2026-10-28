import Link from "next/link";
import { CalendarCheck, CalendarDays, CheckCheck, CircleDollarSign, Users, XCircle } from "lucide-react";
import { requireAuth } from "@/server/auth/guard";
import { getDashboard } from "@/server/dashboard/service";
import { getOnboarding } from "@/server/dashboard/onboarding";
import { OnboardingChecklist } from "@/components/panel/onboarding-checklist";
import { toAppointmentRow } from "@/server/appointments/dto";
import { formatMoney } from "@/lib/money";
import { formatDateLongBR } from "@/lib/time";
import { AppointmentList } from "@/components/panel/appointment-list";
import { buttonClasses } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";

export default async function DashboardPage() {
  const auth = await requireAuth();
  const [d, onboarding] = await Promise.all([getDashboard(auth.professionalId, auth.timezone), getOnboarding(auth.professionalId)]);
  const showOnboarding = onboarding.some((s) => !s.done);
  const firstName = auth.professionalName.split(" ")[0];

  const stats = [
    { label: "Hoje", value: d.todayCount, icon: CalendarDays, hint: "agendamentos" },
    { label: "Próximos", value: d.upcomingCount, icon: CalendarCheck, hint: "em aberto" },
    { label: "Concluídos", value: d.completedMonth, icon: CheckCheck, hint: "neste mês" },
    { label: "Cancelamentos", value: d.cancelledMonth, icon: XCircle, hint: "neste mês" },
    { label: "Clientes", value: d.customers, icon: Users, hint: "cadastradas" },
    { label: "Faturamento", value: formatMoney(d.revenueMonth), icon: CircleDollarSign, hint: "concluídos no mês" },
  ];

  return (
    <>
      <PageHeader
        title={`Olá, ${firstName}`}
        description={`Hoje é ${formatDateLongBR(new Date(), auth.timezone)}.`}
        actions={
          <Link href="/painel/calendario" className={buttonClasses("outline", "sm")}>
            <CalendarDays className="size-4" /> Abrir calendário
          </Link>
        }
      />
      {showOnboarding && <OnboardingChecklist steps={onboarding} slug={auth.professionalSlug} />}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center justify-between text-cocoa-muted">
              <span className="text-xs font-medium uppercase tracking-wider">{s.label}</span>
              <s.icon className="size-4 text-gold-deep" />
            </div>
            <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-xs text-cocoa-muted">{s.hint}</p>
          </Card>
        ))}
      </div>

      <div className="mb-3 mt-10 flex items-end justify-between">
        <h2 className="font-display text-2xl font-semibold">Próximos atendimentos</h2>
        <Link href="/painel/agendamentos" className="text-sm font-medium text-gold-deep hover:underline">
          Ver todos
        </Link>
      </div>
      {d.upcoming.length === 0 ? (
        <EmptyState icon={<CalendarCheck className="size-8" />} title="Nenhum atendimento por vir">
          Compartilhe o link da sua página para receber agendamentos:{" "}
          <span className="font-medium text-cocoa">/agendar/{auth.professionalSlug}</span>
        </EmptyState>
      ) : (
        <AppointmentList items={d.upcoming.map(toAppointmentRow)} timezone={auth.timezone} professionalName={auth.professionalName} />
      )}
    </>
  );
}
