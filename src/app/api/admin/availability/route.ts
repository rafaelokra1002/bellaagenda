import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/errors";
import { adminAvailabilityQuerySchema } from "@/validation/admin";
import { adminRoute, json, parseQuery } from "@/server/http";
import { getAvailableSlots, serializeSlots } from "@/server/availability/service";
import { appointmentDurations } from "@/server/appointments/service";

export const dynamic = "force-dynamic";

/** Horários livres para remarcação (ignora antecedência mínima, nunca o passado). */
export const GET = adminRoute(async (req, auth) => {
  const { appointmentId, date } = parseQuery(req, adminAvailabilityQuerySchema);
  const appt = await prisma.appointment.findFirst({ where: { id: appointmentId, professionalId: auth.professionalId } });
  if (!appt) throw notFound("Agendamento");
  const professional = await prisma.professional.findUniqueOrThrow({ where: { id: auth.professionalId } });
  const slots = await getAvailableSlots(prisma, {
    professional,
    date,
    ...appointmentDurations(appt),
    excludeAppointmentId: appt.id,
    enforceBookingWindow: false,
  });
  return json({ date, slots: serializeSlots(slots) });
});
