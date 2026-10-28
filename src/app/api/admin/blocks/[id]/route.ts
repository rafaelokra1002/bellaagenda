import { idSchema } from "@/validation/admin";
import { adminRoute, json } from "@/server/http";
import { deleteBlock } from "@/server/schedule/service";

export const DELETE = adminRoute(async (_req, auth, { id }) => {
  await deleteBlock(auth.professionalId, idSchema.parse(id));
  return json({ ok: true });
});
