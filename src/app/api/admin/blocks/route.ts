import { blockSchema } from "@/validation/admin";
import { adminRoute, json, parseBody } from "@/server/http";
import { createBlock } from "@/server/schedule/service";

export const POST = adminRoute(async (req, auth) => {
  const { block, conflicts } = await createBlock(auth.professionalId, await parseBody(req, blockSchema));
  return json({ id: block.id, conflicts }, { status: 201 });
});
