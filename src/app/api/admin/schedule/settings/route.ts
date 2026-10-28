import { scheduleSettingsSchema } from "@/validation/admin";
import { adminRoute, json, parseBody } from "@/server/http";
import { saveScheduleSettings } from "@/server/schedule/service";

export const PUT = adminRoute(async (req, auth) => {
  await saveScheduleSettings(auth.professionalId, await parseBody(req, scheduleSettingsSchema));
  return json({ ok: true });
});
