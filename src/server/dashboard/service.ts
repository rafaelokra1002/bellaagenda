import { prisma } from "@/lib/prisma";
import { centsToDecimalString, decimalToCents } from "@/lib/money";
import { ACTIVE_STATUSES } from "@/lib/status";
import { addMonths, localRangeToUtc, startOfMonth, toLocalDate, zonedToUtc } from "@/lib/time";

/** Indicadores calculados a partir dos dados reais da profissional. */
export async function getDashboard(professionalId: string, timezone: string, now = new Date()) {
  const today = toLocalDate(now, timezone);
  const { start: dayStart, end: dayEnd } = localRangeToUtc(today, today, timezone);
  const monthStartLocal = startOfMonth(today);
  const monthStart = zonedToUtc(monthStartLocal, "00:00", timezone);
  const monthEnd = zonedToUtc(addMonths(monthStartLocal, 1), "00:00", timezone);
  const inMonth = { professionalId, startAt: { gte: monthStart, lt: monthEnd } };

  const [todayCount, upcomingCount, completedMonth, cancelledMonth, customers, revenue, upcoming] = await Promise.all([
    prisma.appointment.count({ where: { professionalId, startAt: { gte: dayStart, lt: dayEnd }, status: { not: "CANCELADO" } } }),
    prisma.appointment.count({ where: { professionalId, startAt: { gte: now }, status: { in: ACTIVE_STATUSES } } }),
    prisma.appointment.count({ where: { ...inMonth, status: "CONCLUIDO" } }),
    prisma.appointment.count({ where: { ...inMonth, status: "CANCELADO" } }),
    prisma.customer.count({ where: { professionalId, anonymizedAt: null } }),
    // Faturamento: somente atendimentos CONCLUÍDOS (cancelados e faltas não contam).
    prisma.appointment.aggregate({ where: { ...inMonth, status: "CONCLUIDO" }, _sum: { priceSnapshot: true } }),
    prisma.appointment.findMany({
      where: { professionalId, occupiedUntil: { gte: now }, status: { in: ACTIVE_STATUSES } },
      orderBy: { startAt: "asc" },
      take: 8,
      include: { customer: { select: { id: true, name: true, whatsapp: true } } },
    }),
  ]);

  const revenueCents = revenue._sum.priceSnapshot ? decimalToCents(revenue._sum.priceSnapshot) : 0;
  return {
    todayCount,
    upcomingCount,
    completedMonth,
    cancelledMonth,
    customers,
    revenueMonth: centsToDecimalString(revenueCents),
    upcoming,
  };
}
