import { idSchema } from "@/validation/admin";
import { adminRoute, json } from "@/server/http";
import { getAppointmentForAdmin } from "@/server/appointments/service";

export const GET = adminRoute(async (_req, auth, { id }) => {
  const a = await getAppointmentForAdmin(auth.professionalId, idSchema.parse(id));
  return json({
    appointment: {
      id: a.id,
      status: a.status,
      startAt: a.startAt.toISOString(),
      endAt: a.endAt.toISOString(),
      serviceName: a.serviceNameSnapshot,
      price: a.priceSnapshot.toFixed(2),
      customerNotes: a.customerNotes,
      createdAt: a.createdAt.toISOString(),
      customer: a.customer,
      audits: a.audits.map((x) => ({
        id: x.id,
        action: x.action,
        previousStatus: x.previousStatus,
        newStatus: x.newStatus,
        previousStartAt: x.previousStartAt?.toISOString() ?? null,
        newStartAt: x.newStartAt?.toISOString() ?? null,
        changedBy: x.changedByName,
        createdAt: x.createdAt.toISOString(),
      })),
    },
  });
});
