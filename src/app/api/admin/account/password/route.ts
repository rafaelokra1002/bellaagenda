import { passwordChangeSchema } from "@/validation/admin";
import { adminRoute, json, parseBody } from "@/server/http";
import { changePassword } from "@/server/professional/service";
import { readCookie, SESSION_COOKIE } from "@/server/auth/session";

export const POST = adminRoute(async (req, auth) => {
  const values = await parseBody(req, passwordChangeSchema);
  await changePassword(auth.userId, readCookie(req.headers.get("cookie"), SESSION_COOKIE), values);
  return json({ ok: true });
});
