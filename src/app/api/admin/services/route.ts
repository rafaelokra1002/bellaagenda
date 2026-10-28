import { serviceSchema } from "@/validation/admin";
import { adminRoute, json, parseBody } from "@/server/http";
import { createService, listServices } from "@/server/catalog/service";

export const GET = adminRoute(async (_req, auth) => json({ services: await listServices(auth.professionalId) }));

export const POST = adminRoute(async (req, auth) => {
  const values = await parseBody(req, serviceSchema);
  return json({ service: await createService(auth.professionalId, values) }, { status: 201 });
});
