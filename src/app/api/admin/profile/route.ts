import { profileSchema } from "@/validation/admin";
import { adminRoute, json, parseBody } from "@/server/http";
import { updateProfile } from "@/server/professional/service";

export const PUT = adminRoute(async (req, auth) => {
  const p = await updateProfile(auth.professionalId, await parseBody(req, profileSchema));
  return json({ slug: p.slug });
});
