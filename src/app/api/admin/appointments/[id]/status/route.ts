import { idSchema, statusChangeSchema } from "@/validation/admin";
import { adminRoute, json, parseBody } from "@/server/http";
import { changeAppointmentStatus } from "@/server/appointments/service";

export const POST = adminRoute(async (req, auth, { id }) => {
  const { status } = await parseBody(req, statusChangeSchema);
  const updated = await changeAppointmentStatus(auth, idSchema.parse(id), status);
  return json({ id: updated.id, status: updated.status });
});
