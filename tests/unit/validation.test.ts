import { describe, expect, it } from "vitest";
import { publicBookingSchema } from "@/validation/booking";
import { blockSchema, profileSchema, scheduleSettingsSchema, serviceSchema } from "@/validation/admin";

const booking = {
  serviceId: "ckservice000000000001",
  startAt: "2030-01-08T11:00:00.000Z",
  name: "Ana Souza",
  whatsapp: "(71) 99999-8888",
  consent: true,
};

describe("formulário público", () => {
  it("aceita dados válidos", () => {
    expect(publicBookingSchema.safeParse(booking).success).toBe(true);
  });
  it("exige consentimento LGPD", () => {
    expect(publicBookingSchema.safeParse({ ...booking, consent: false }).success).toBe(false);
  });
  it("rejeita WhatsApp, nome e data inválidos", () => {
    expect(publicBookingSchema.safeParse({ ...booking, whatsapp: "123" }).success).toBe(false);
    expect(publicBookingSchema.safeParse({ ...booking, name: "A" }).success).toBe(false);
    expect(publicBookingSchema.safeParse({ ...booking, name: "<script>" }).success).toBe(false);
    expect(publicBookingSchema.safeParse({ ...booking, startAt: "amanhã" }).success).toBe(false);
  });
  it("rejeita identificadores malformados", () => {
    expect(publicBookingSchema.safeParse({ ...booking, serviceId: "'; DROP TABLE" }).success).toBe(false);
  });
  it("rejeita honeypot preenchido", () => {
    expect(publicBookingSchema.safeParse({ ...booking, website: "spam" }).success).toBe(false);
  });
});

describe("formulários do painel", () => {
  const service = { name: "Lash", description: "", price: "90,00", durationMinutes: 60, bufferMinutes: null, imageUrl: "", isActive: true };
  it("valida serviço", () => {
    expect(serviceSchema.safeParse(service).success).toBe(true);
    expect(serviceSchema.safeParse({ ...service, price: "-5" }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...service, durationMinutes: 0 }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...service, imageUrl: "http://inseguro.com/a.jpg" }).success).toBe(false);
  });
  it("valida regras da agenda", () => {
    expect(scheduleSettingsSchema.safeParse({ slotStepMinutes: 30, defaultBufferMinutes: 0, minNoticeMinutes: 120, maxAdvanceDays: 60, timezone: "America/Bahia" }).success).toBe(true);
    expect(scheduleSettingsSchema.safeParse({ slotStepMinutes: 7, defaultBufferMinutes: 0, minNoticeMinutes: 120, maxAdvanceDays: 60, timezone: "America/Bahia" }).success).toBe(false);
    expect(scheduleSettingsSchema.safeParse({ slotStepMinutes: 30, defaultBufferMinutes: 0, minNoticeMinutes: 120, maxAdvanceDays: 60, timezone: "Marte/Base" }).success).toBe(false);
  });
  it("valida bloqueio", () => {
    expect(blockSchema.safeParse({ startDate: "2030-01-08", startTime: "08:00", endDate: "2030-01-08", endTime: "25:00" }).success).toBe(false);
  });
  it("valida slug do perfil", () => {
    const p = { name: "Maria", slug: "maria-silva", whatsapp: "71999998888", isActive: true };
    expect(profileSchema.safeParse(p).success).toBe(true);
    expect(profileSchema.safeParse({ ...p, slug: "Maria Silva" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...p, slug: "painel" }).success).toBe(false);
  });
});
