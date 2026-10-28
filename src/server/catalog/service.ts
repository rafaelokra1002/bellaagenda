import type { Service } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError, notFound } from "@/lib/errors";
import { centsToDecimalString, parseMoneyToCents } from "@/lib/money";
import { emptyToNull } from "@/validation/common";
import type { ServiceValues } from "@/validation/admin";

export interface ServiceDTO {
  id: string;
  name: string;
  description: string | null;
  price: string; // "120.00"
  durationMinutes: number;
  bufferMinutes: number | null;
  imageUrl: string | null;
  isActive: boolean;
  appointmentCount?: number;
}

export function toServiceDTO(s: Service & { _count?: { appointments: number } }): ServiceDTO {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    price: s.price.toFixed(2),
    durationMinutes: s.durationMinutes,
    bufferMinutes: s.bufferMinutes,
    imageUrl: s.imageUrl,
    isActive: s.isActive,
    appointmentCount: s._count?.appointments,
  };
}

function toData(v: ServiceValues) {
  const cents = parseMoneyToCents(v.price);
  if (cents === null) throw new AppError("VALIDATION", "Valor inválido.");
  return {
    name: v.name.trim(),
    description: emptyToNull(v.description),
    price: centsToDecimalString(cents),
    durationMinutes: v.durationMinutes,
    bufferMinutes: v.bufferMinutes,
    imageUrl: emptyToNull(v.imageUrl),
    isActive: v.isActive,
  };
}

export async function listServices(professionalId: string): Promise<ServiceDTO[]> {
  const rows = await prisma.service.findMany({
    where: { professionalId },
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { appointments: true } } },
  });
  return rows.map(toServiceDTO);
}

export async function createService(professionalId: string, v: ServiceValues): Promise<ServiceDTO> {
  const count = await prisma.service.count({ where: { professionalId } });
  const s = await prisma.service.create({ data: { ...toData(v), professionalId, sortOrder: count } });
  return toServiceDTO(s);
}

export async function updateService(professionalId: string, id: string, v: ServiceValues): Promise<ServiceDTO> {
  const owned = await prisma.service.findFirst({ where: { id, professionalId }, select: { id: true } });
  if (!owned) throw notFound("Serviço");
  // Agendamentos existentes guardam nome/preço/duração próprios (snapshot) e não mudam.
  const s = await prisma.service.update({ where: { id }, data: toData(v) });
  return toServiceDTO(s);
}

export async function deleteService(professionalId: string, id: string): Promise<void> {
  const owned = await prisma.service.findFirst({ where: { id, professionalId }, include: { _count: { select: { appointments: true } } } });
  if (!owned) throw notFound("Serviço");
  if (owned._count.appointments > 0) {
    throw new AppError("CONFLICT", "Este serviço possui agendamentos no histórico e não pode ser excluído. Desative-o para ocultá-lo da página pública.");
  }
  await prisma.service.delete({ where: { id } });
}
