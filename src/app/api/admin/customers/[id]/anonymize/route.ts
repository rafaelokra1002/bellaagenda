import { idSchema } from "@/validation/admin";
import { adminRoute, json } from "@/server/http";
import { anonymizeCustomer } from "@/server/customers/service";

export const POST = adminRoute(async (_req, auth, { id }) => {
  await anonymizeCustomer(auth.professionalId, idSchema.parse(id));
  return json({ ok: true });
});
