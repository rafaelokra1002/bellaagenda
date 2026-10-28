import { z } from "zod";
import { normalizeWhatsapp } from "@/lib/phone";
import { parseMoneyToCents } from "@/lib/money";
import { isLocalDate, isLocalTime, isValidTimeZone } from "@/lib/time";

export const idSchema = z.string().min(10, "Identificador inválido.").max(40).regex(/^[a-z0-9]+$/i, "Identificador inválido.");

export const localDateSchema = z.string().refine(isLocalDate, "Data inválida.");
export const localTimeSchema = z.string().refine(isLocalTime, "Horário inválido (use HH:MM).");
export const timezoneSchema = z.string().max(64).refine(isValidTimeZone, "Fuso horário inválido.");

export const whatsappSchema = z
  .string()
  .trim()
  .min(1, "Informe o WhatsApp.")
  .max(25)
  .refine((v) => normalizeWhatsapp(v) !== null, "WhatsApp inválido. Use DDD + número, ex.: (71) 99999-8888.");

export const moneySchema = z
  .string()
  .trim()
  .min(1, "Informe o valor.")
  .refine((v) => {
    const c = parseMoneyToCents(v);
    return c !== null && c <= 99_999_999;
  }, "Valor inválido. Ex.: 120,00");

export const optionalHttpsUrl = z
  .string()
  .trim()
  .max(500, "URL muito longa.")
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), "Use um endereço que comece com https://")
  .optional();

export const personNameSchema = z
  .string()
  .trim()
  .min(2, "Informe o nome completo.")
  .max(80, "Nome muito longo.")
  .regex(/^[\p{L}\p{M}' .-]+$/u, "Use apenas letras no nome.");

export const isoDateTimeSchema = z.string().datetime({ offset: true, message: "Data/hora inválida." });

export const emptyToNull = (v: string | undefined | null): string | null => (v && v.trim() ? v.trim() : null);
