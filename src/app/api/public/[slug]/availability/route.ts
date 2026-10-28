import { prisma } from "@/lib/prisma";
import { AppError, notFound } from "@/lib/errors";
import { availabilityQuerySchema } from "@/validation/booking";
import { clientIp, json, parseQuery, route } from "@/server/http";
import { enforce, LIMITS } from "@/server/rate-limit";
import { effectiveBuffer, getAvailableSlots, serializeSlots } from "@/server/availability/service";

export const dynamic = "force-dynamic";

export const GET = route(async (req, { slug = "" }) => {
  await enforce(`avail:${clientIp(req)}`, LIMITS.availability, "Muitas consultas seguidas. Aguarde alguns segundos.");
  const { serviceId, date } = parseQuery(req, availabilityQuerySchema);

  const professional = await prisma.professional.findFirst({ where: { slug, isActive: true } });
  if (!professional) throw notFound("Profissional");
  const service = await prisma.service.findFirst({ where: { id: serviceId, professionalId: professional.id, isActive: true } });
  if (!service) throw new AppError("NOT_FOUND", "Serviço não encontrado.");

  const slots = await getAvailableSlots(prisma, {
    professional,
    date,
    durationMinutes: service.durationMinutes,
    bufferMinutes: effectiveBuffer(service.bufferMinutes, professional.defaultBufferMinutes),
  });
  return json({ date, slots: serializeSlots(slots) }, { headers: { "Cache-Control": "no-store" } });
});
