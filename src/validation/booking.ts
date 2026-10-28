import { z } from "zod";
import { idSchema, isoDateTimeSchema, localDateSchema, personNameSchema, whatsappSchema } from "./common";

export const availabilityQuerySchema = z.object({
  serviceId: idSchema,
  date: localDateSchema,
});

export const customerFormSchema = z.object({
  name: personNameSchema,
  whatsapp: whatsappSchema,
  notes: z.string().trim().max(500, "Máximo de 500 caracteres.").optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "É preciso concordar para continuar." }) }),
});
export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export const publicBookingSchema = customerFormSchema.extend({
  serviceId: idSchema,
  startAt: isoDateTimeSchema,
  // Honeypot: campo invisível que pessoas reais deixam vazio.
  website: z.string().max(0).optional(),
});
export type PublicBookingInput = z.infer<typeof publicBookingSchema>;
