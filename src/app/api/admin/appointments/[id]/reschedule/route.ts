import { idSchema, rescheduleSchema } from "@/validation/admin";
import { adminRoute, json, parseBody } from "@/server/http";
import { rescheduleAppointment } from "@/server/appointments/service";

export const POST = adminRoute(async (req, auth, { id }) => {
  const { startAt } = await parseBody(req, rescheduleSchema);
  const updated = await rescheduleAppointment(auth, idSchema.parse(id), new Date(startAt));
  return json({ id: updated.id, startAt: updated.startAt.toISOString() });
});
