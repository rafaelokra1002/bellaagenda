import { idSchema, serviceSchema } from "@/validation/admin";
import { adminRoute, json, parseBody } from "@/server/http";
import { deleteService, updateService } from "@/server/catalog/service";

export const PATCH = adminRoute(async (req, auth, { id }) => {
  const values = await parseBody(req, serviceSchema);
  return json({ service: await updateService(auth.professionalId, idSchema.parse(id), values) });
});

export const DELETE = adminRoute(async (_req, auth, { id }) => {
  await deleteService(auth.professionalId, idSchema.parse(id));
  return json({ ok: true });
});
