import { describe, expect, it } from "vitest";
import { addDays, dayOfWeek, diffDays, formatDateBR, formatTimeBR, isLocalDate, startOfWeek, toLocalDate, toLocalTime, zonedToUtc } from "@/lib/time";

describe("fuso horário", () => {
  it("converte horário local de America/Bahia (UTC-3) para UTC", () => {
    expect(zonedToUtc("2030-01-08", "08:00", "America/Bahia").toISOString()).toBe("2030-01-08T11:00:00.000Z");
  });

  it("vira o dia corretamente perto da meia-noite", () => {
    const d = zonedToUtc("2030-01-08", "23:30", "America/Bahia");
    expect(d.toISOString()).toBe("2030-01-09T02:30:00.000Z");
    expect(toLocalDate(d, "America/Bahia")).toBe("2030-01-08");
    expect(toLocalTime(d, "America/Bahia")).toBe("23:30");
  });

  it("respeita horário de verão em fusos que o adotam", () => {
    // Nova York: inverno UTC-5, verão UTC-4
    expect(zonedToUtc("2030-01-15", "09:00", "America/New_York").toISOString()).toBe("2030-01-15T14:00:00.000Z");
    expect(zonedToUtc("2030-07-15", "09:00", "America/New_York").toISOString()).toBe("2030-07-15T13:00:00.000Z");
  });

  it("formata no padrão brasileiro", () => {
    const d = new Date("2030-01-08T11:05:00Z");
    expect(formatDateBR(d, "America/Bahia")).toBe("08/01/2030");
    expect(formatTimeBR(d, "America/Bahia")).toBe("08:05");
  });

  it("calcula datas de calendário", () => {
    expect(dayOfWeek("2030-01-06")).toBe(0); // domingo
    expect(addDays("2030-01-31", 1)).toBe("2030-02-01");
    expect(diffDays("2030-01-01", "2030-03-01")).toBe(59);
    expect(startOfWeek("2030-01-09")).toBe("2030-01-06");
    expect(isLocalDate("2030-02-30")).toBe(false);
    expect(isLocalDate("2030-02-28")).toBe(true);
  });
});
