import { businessHoursSchema } from "@/validation/admin";
import { adminRoute, json, parseBody } from "@/server/http";
import { saveBusinessHours } from "@/server/schedule/service";

export const PUT = adminRoute(async (req, auth) => {
  const values = await parseBody(req, businessHoursSchema);
  return json(await saveBusinessHours(auth.professionalId, values));
});
