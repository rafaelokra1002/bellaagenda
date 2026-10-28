import { AppError } from "@/lib/errors";
import { normalizeWhatsapp } from "@/lib/phone";
import { publicBookingSchema } from "@/validation/booking";
import { clientIp, json, parseBody, route } from "@/server/http";
import { enforce, LIMITS } from "@/server/rate-limit";
import { createPublicAppointment } from "@/server/appointments/service";

export const POST = route(async (req, { slug = "" }) => {
  const input = await parseBody(req, publicBookingSchema);
  if (input.website) throw new AppError("VALIDATION", "Não foi possível concluir o agendamento.");

  await enforce(`book:ip:${clientIp(req)}`, LIMITS.bookingPerIp, "Muitos agendamentos seguidos deste aparelho. Tente novamente mais tarde.");
  await enforce(`book:phone:${slug}:${normalizeWhatsapp(input.whatsapp) ?? "x"}`, LIMITS.bookingPerPhone, "Limite diário de agendamentos para este WhatsApp atingido. Fale com a profissional.");

  const { publicToken } = await createPublicAppointment(slug, input);
  return json({ token: publicToken, redirectTo: `/agendar/${slug}/confirmacao?codigo=${publicToken}` }, { status: 201 });
});
