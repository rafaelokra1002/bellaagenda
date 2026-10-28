import { z } from "zod";
import {
  idSchema,
  isoDateTimeSchema,
  localDateSchema,
  localTimeSchema,
  moneySchema,
  optionalHttpsUrl,
  timezoneSchema,
  whatsappSchema,
} from "./common";

export const APPOINTMENT_STATUSES = ["PENDENTE", "CONFIRMADO", "CONCLUIDO", "CANCELADO", "NAO_COMPARECEU"] as const;
export const appointmentStatusSchema = z.enum(APPOINTMENT_STATUSES);

// ---------- Autenticação ----------
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(160),
  password: z.string().min(1, "Informe a senha.").max(200),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual.").max(200),
    newPassword: z.string().min(10, "Use pelo menos 10 caracteres.").max(200),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem." });
export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;

// ---------- Serviços ----------
export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(80),
  description: z.string().trim().max(500, "Máximo de 500 caracteres.").optional(),
  price: moneySchema,
  durationMinutes: z.number({ invalid_type_error: "Informe a duração." }).int().min(5, "Mínimo de 5 minutos.").max(720, "Máximo de 12 horas."),
  bufferMinutes: z.number().int().min(0).max(240).nullable(),
  imageUrl: optionalHttpsUrl,
  isActive: z.boolean(),
});
export type ServiceValues = z.infer<typeof serviceSchema>;

// ---------- Agenda ----------
export const SLOT_STEPS = [5, 10, 15, 20, 30, 45, 60] as const;

export const businessHoursSchema = z.object({
  periods: z
    .array(z.object({ dayOfWeek: z.number().int().min(0).max(6), startTime: localTimeSchema, endTime: localTimeSchema }))
    .max(70),
});
export type BusinessHoursValues = z.infer<typeof businessHoursSchema>;

export const scheduleSettingsSchema = z.object({
  slotStepMinutes: z.number().int().refine((v) => (SLOT_STEPS as readonly number[]).includes(v), "Escolha um intervalo válido."),
  defaultBufferMinutes: z.number().int().min(0).max(240),
  minNoticeMinutes: z.number().int().min(0).max(60 * 24 * 14),
  maxAdvanceDays: z.number().int().min(1).max(365),
  timezone: timezoneSchema,
});
export type ScheduleSettingsValues = z.infer<typeof scheduleSettingsSchema>;

export const blockSchema = z.object({
  startDate: localDateSchema,
  startTime: localTimeSchema,
  endDate: localDateSchema,
  endTime: localTimeSchema,
  reason: z.string().trim().max(120).optional(),
  force: z.boolean().optional(),
});
export type BlockValues = z.infer<typeof blockSchema>;

// ---------- Agendamentos ----------
export const statusChangeSchema = z.object({ status: appointmentStatusSchema });
export const rescheduleSchema = z.object({ startAt: isoDateTimeSchema });

export const appointmentFiltersSchema = z.object({
  q: z.string().trim().max(80).optional(),
  date: localDateSchema.optional(),
  serviceId: idSchema.optional(),
  status: appointmentStatusSchema.optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

/** Horários livres para remarcar um atendimento (usa a duração gravada nele). */
export const adminAvailabilityQuerySchema = z.object({
  appointmentId: idSchema,
  date: localDateSchema,
});

// ---------- Perfil ----------
export const RESERVED_SLUGS = ["admin", "api", "painel", "login", "agendar", "app", "www"];

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome profissional.").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Mínimo de 3 caracteres.")
    .max(50)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens (ex.: maria-silva).")
    .refine((s) => !RESERVED_SLUGS.includes(s), "Este endereço é reservado."),
  headline: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  photoUrl: optionalHttpsUrl,
  coverUrl: optionalHttpsUrl,
  accentColor: z
    .string()
    .trim()
    .refine((v) => v === "" || /^#[0-9a-f]{6}$/i.test(v), "Use uma cor no formato #RRGGBB.")
    .optional(),
  whatsapp: whatsappSchema,
  address: z.string().trim().max(200).optional(),
  instagram: z
    .string()
    .trim()
    .max(40)
    .refine((v) => v === "" || /^@?[a-zA-Z0-9._]{1,30}$/.test(v), "Usuário do Instagram inválido.")
    .optional(),
  isActive: z.boolean(),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export { idSchema };
