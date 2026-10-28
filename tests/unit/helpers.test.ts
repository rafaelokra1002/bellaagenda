import { describe, expect, it } from "vitest";
import { centsToDecimalString, formatCents, parseMoneyToCents } from "@/lib/money";
import { formatWhatsapp, maskWhatsappInput, normalizeWhatsapp } from "@/lib/phone";
import { canReschedule, canTransition, requiresStarted } from "@/lib/status";
import { buildWhatsappLink, customerConfirmationMessage } from "@/lib/whatsapp";

describe("telefone", () => {
  it("normaliza formatos diferentes para o mesmo número", () => {
    const expected = "5571999998888";
    for (const v of ["(71) 99999-8888", "71999998888", "+55 71 99999-8888", "071 99999 8888", "0055 71 999998888"]) {
      expect(normalizeWhatsapp(v)).toBe(expected);
    }
  });
  it("rejeita números inválidos", () => {
    expect(normalizeWhatsapp("123")).toBeNull();
    expect(normalizeWhatsapp("(71) 89999-8888")).toBeNull(); // celular de 9 dígitos sem o 9 inicial
    expect(normalizeWhatsapp("+1 415 555 0100")).toBeNull();
  });
  it("formata e mascara", () => {
    expect(formatWhatsapp("5571999998888")).toBe("(71) 99999-8888");
    expect(maskWhatsappInput("7199999")).toBe("(71) 9999-9");
  });
});

describe("dinheiro", () => {
  it("converte valores em centavos sem ponto flutuante", () => {
    expect(parseMoneyToCents("120")).toBe(12000);
    expect(parseMoneyToCents("120,5")).toBe(12050);
    expect(parseMoneyToCents("1.234,56")).toBe(123456);
    expect(parseMoneyToCents("70.00")).toBe(7000);
    expect(parseMoneyToCents("R$ 35,00")).toBe(3500);
    expect(parseMoneyToCents("abc")).toBeNull();
    expect(parseMoneyToCents("1,234")).toBeNull();
  });
  it("soma sem erro de arredondamento", () => {
    const total = ["0.10", "0.20"].reduce((s, v) => s + parseMoneyToCents(v)!, 0);
    expect(centsToDecimalString(total)).toBe("0.30");
    expect(formatCents(12000).replace(/\s/g, " ")).toBe("R$ 120,00");
  });
});

describe("WhatsApp", () => {
  it("gera link wa.me com mensagem codificada", () => {
    const msg = customerConfirmationMessage({ serviceName: "Design & henna", dateLabel: "08/01/2030", timeLabel: "08:00", professionalName: "Maria" });
    const link = buildWhatsappLink("5571999998888", msg);
    expect(link.startsWith("https://wa.me/5571999998888?text=")).toBe(true);
    expect(decodeURIComponent(link.split("text=")[1]!)).toBe(msg);
    expect(link).not.toContain(" ");
    expect(link).toContain("%26"); // "&" codificado
    expect(msg).toContain("Olá! Gostaria de confirmar meu agendamento.");
  });
});

describe("transições de status", () => {
  it("permite fluxo normal e bloqueia transições inválidas", () => {
    expect(canTransition("PENDENTE", "CONFIRMADO")).toBe(true);
    expect(canTransition("CONFIRMADO", "CONCLUIDO")).toBe(true);
    expect(canTransition("CANCELADO", "CONFIRMADO")).toBe(false);
    expect(canTransition("CONCLUIDO", "CANCELADO")).toBe(false);
    expect(requiresStarted("CONCLUIDO")).toBe(true);
    expect(canReschedule("CANCELADO")).toBe(false);
    expect(canReschedule("CONFIRMADO")).toBe(true);
  });
});
