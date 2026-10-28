import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError, notFound } from "@/lib/errors";
import { ACTIVE_STATUSES } from "@/lib/status";

export const CUSTOMERS_PAGE_SIZE = 20;

export async function listCustomers(professionalId: string, q: string | undefined, page: number) {
  const where: Prisma.CustomerWhereInput = { professionalId, anonymizedAt: null };
  if (q) {
    const digits = q.replace(/\D/g, "");
    where.OR = [{ name: { contains: q, mode: "insensitive" } }, ...(digits.length >= 3 ? [{ whatsapp: { contains: digits } }] : [])];
  }
  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * CUSTOMERS_PAGE_SIZE, take: CUSTOMERS_PAGE_SIZE }),
  ]);
  const ids = customers.map((c) => c.id);
  const [firsts, completed] = ids.length
    ? await Promise.all([
        prisma.appointment.groupBy({ by: ["customerId"], where: { customerId: { in: ids } }, _min: { startAt: true }, _count: { _all: true } }),
        prisma.appointment.groupBy({ by: ["customerId"], where: { customerId: { in: ids }, status: "CONCLUIDO" }, _max: { startAt: true }, _count: { _all: true } }),
      ])
    : [[], []];
  const firstMap = new Map(firsts.map((r) => [r.customerId, r]));
  const doneMap = new Map(completed.map((r) => [r.customerId, r]));
  return {
    total,
    pageCount: Math.max(1, Math.ceil(total / CUSTOMERS_PAGE_SIZE)),
    items: customers.map((c) => ({
      id: c.id,
      name: c.name,
      whatsapp: c.whatsapp,
      firstAppointmentAt: firstMap.get(c.id)?._min.startAt ?? null,
      totalAppointments: firstMap.get(c.id)?._count._all ?? 0,
      lastCompletedAt: doneMap.get(c.id)?._max.startAt ?? null,
      completedCount: doneMap.get(c.id)?._count._all ?? 0,
    })),
  };
}

export async function getCustomer(professionalId: string, id: string) {
  const customer = await prisma.customer.findFirst({
    where: { id, professionalId },
    include: { appointments: { orderBy: { startAt: "desc" } } },
  });
  if (!customer) throw notFound("Cliente");
  return customer;
}

/**
 * LGPD: atende pedido de eliminação anonimizando os dados pessoais e
 * preservando o histórico financeiro/agenda (sem identificar a pessoa).
 */
export async function anonymizeCustomer(professionalId: string, id: string, now = new Date()) {
  const customer = await prisma.customer.findFirst({ where: { id, professionalId } });
  if (!customer) throw notFound("Cliente");
  const open = await prisma.appointment.count({ where: { customerId: id, status: { in: ACTIVE_STATUSES }, startAt: { gt: now } } });
  if (open > 0) throw new AppError("CONFLICT", "Cancele ou conclua os atendimentos futuros desta cliente antes de remover os dados.");
  await prisma.$transaction([
    prisma.customer.update({ where: { id }, data: { name: "Cliente removida", whatsapp: `anon-${id}`, anonymizedAt: now, consentAt: null } }),
    prisma.appointment.updateMany({ where: { customerId: id }, data: { customerNotes: null } }),
  ]);
}
