import { describe, expect, it } from "vitest";
import { computeSlots, findInvalidPeriods, overlaps, periodsForDate, subtractIntervals, type ComputeSlotsInput } from "@/server/availability/engine";
import { zonedToUtc } from "@/lib/time";

const TZ = "America/Bahia";
const at = (date: string, time: string) => zonedToUtc(date, time, TZ);
// Segunda 07/01/2030 às 07:00 locais
const NOW = at("2030-01-07", "07:00");
const DAY = "2030-01-08"; // terça

const base = (over: Partial<ComputeSlotsInput> = {}): ComputeSlotsInput => ({
  date: DAY,
  timezone: TZ,
  periods: [
    { startTime: "08:00", endTime: "12:00" },
    { startTime: "14:00", endTime: "18:00" },
  ],
  durationMinutes: 60,
  bufferMinutes: 0,
  rules: { slotStepMinutes: 30, minNoticeMinutes: 120, maxAdvanceDays: 60 },
  now: NOW,
  busy: [],
  ...over,
});
const times = (input: ComputeSlotsInput) => computeSlots(input).map((s) => s.time);

describe("cálculo de disponibilidade", () => {
  it("gera horários dentro dos períodos, respeitando o intervalo de almoço", () => {
    expect(times(base())).toEqual([
      "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00",
      "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
    ]);
  });

  it("não ultrapassa o expediente considerando duração + intervalo adicional", () => {
    const t = times(base({ durationMinutes: 120, bufferMinutes: 15 }));
    // 120 + 15 = 135 min: último início pela manhã 09:45 → arredondado ao passo de 30 = 09:30
    expect(t).toEqual(["08:00", "08:30", "09:00", "09:30", "14:00", "14:30", "15:00", "15:30"]);
    for (const s of computeSlots(base({ durationMinutes: 120, bufferMinutes: 15 }))) {
      expect(s.occupiedUntil.getTime() - s.startAt.getTime()).toBe(135 * 60_000);
    }
  });

  it("remove horários que conflitam com atendimentos existentes (intervalo completo)", () => {
    const busy = [{ start: at(DAY, "09:00"), end: at(DAY, "10:15") }];
    const t = times(base({ busy }));
    // 08:00–09:00 encosta e não conflita; 08:30–09:30 conflita; 10:30 livre
    expect(t).toContain("08:00");
    expect(t).not.toContain("08:30");
    expect(t).not.toContain("09:00");
    expect(t).not.toContain("09:30");
    expect(t).not.toContain("10:00");
    expect(t).toContain("10:30");
  });

  it("considera o intervalo adicional do novo atendimento ao checar conflito", () => {
    const busy = [{ start: at(DAY, "09:00"), end: at(DAY, "10:00") }];
    // 08:00 + 60 min + 15 de intervalo = 09:15 > 09:00 → conflita
    expect(times(base({ busy, bufferMinutes: 15 }))).not.toContain("08:00");
  });

  it("bloqueios (folgas/férias) removem horários", () => {
    const busy = [{ start: at(DAY, "00:00"), end: at("2030-01-09", "00:00") }];
    expect(times(base({ busy }))).toEqual([]);
  });

  it("não permite datas passadas", () => {
    expect(times(base({ date: "2030-01-06" }))).toEqual([]);
  });

  it("respeita antecedência mínima no próprio dia", () => {
    // agora 07:00 + 120 min → primeiro horário 09:00
    expect(times(base({ date: "2030-01-07" }))[0]).toBe("09:00");
  });

  it("respeita o limite de dias futuros", () => {
    expect(times(base({ date: "2030-03-10" }))).toEqual([]);
    expect(times(base({ date: "2030-03-08" })).length).toBeGreaterThan(0); // 60 dias
  });

  it("no painel ignora antecedência e limite, mas nunca o passado", () => {
    const t = times(base({ date: "2030-01-07", enforceBookingWindow: false }));
    expect(t[0]).toBe("08:00");
    expect(times(base({ date: "2030-03-10", enforceBookingWindow: false })).length).toBeGreaterThan(0);
    const past = computeSlots(base({ date: "2030-01-07", now: at("2030-01-07", "15:10"), enforceBookingWindow: false }));
    expect(past.every((s) => s.startAt >= at("2030-01-07", "15:10"))).toBe(true);
  });

  it("sem expediente no dia não gera horários", () => {
    expect(times(base({ periods: [] }))).toEqual([]);
  });

  it("filtra períodos pelo dia da semana e ignora inativos", () => {
    const hours = [
      { dayOfWeek: 2, startTime: "14:00", endTime: "18:00", isActive: true },
      { dayOfWeek: 2, startTime: "08:00", endTime: "12:00", isActive: true },
      { dayOfWeek: 2, startTime: "19:00", endTime: "21:00", isActive: false },
      { dayOfWeek: 3, startTime: "08:00", endTime: "12:00", isActive: true },
    ];
    expect(periodsForDate(hours, DAY)).toEqual([
      { startTime: "08:00", endTime: "12:00" },
      { startTime: "14:00", endTime: "18:00" },
    ]);
  });
});

describe("regra de sobreposição", () => {
  const d = (h: number) => new Date(Date.UTC(2030, 0, 1, h));
  it("novoInicio < fimExistente e novoFim > inicioExistente", () => {
    expect(overlaps(d(9), d(11), d(10), d(12))).toBe(true);
    expect(overlaps(d(9), d(10), d(10), d(11))).toBe(false); // encostados
    expect(overlaps(d(8), d(12), d(9), d(10))).toBe(true); // contém
  });
});

describe("validação de expediente", () => {
  it("detecta períodos sobrepostos e invertidos", () => {
    expect(findInvalidPeriods([{ dayOfWeek: 1, startTime: "08:00", endTime: "12:00" }, { dayOfWeek: 1, startTime: "11:00", endTime: "14:00" }])).toMatch(/sobrepõem/);
    expect(findInvalidPeriods([{ dayOfWeek: 1, startTime: "12:00", endTime: "08:00" }])).toMatch(/fim deve ser depois/);
    expect(findInvalidPeriods([{ dayOfWeek: 1, startTime: "08:00", endTime: "12:00" }, { dayOfWeek: 1, startTime: "12:00", endTime: "18:00" }])).toBeNull();
  });
});

describe("horários livres do calendário", () => {
  it("subtrai ocupações dos períodos", () => {
    const free = subtractIntervals([{ start: at(DAY, "08:00"), end: at(DAY, "12:00") }], [{ start: at(DAY, "09:00"), end: at(DAY, "10:00") }]);
    expect(free.map((f) => [f.start.toISOString(), f.end.toISOString()])).toEqual([
      [at(DAY, "08:00").toISOString(), at(DAY, "09:00").toISOString()],
      [at(DAY, "10:00").toISOString(), at(DAY, "12:00").toISOString()],
    ]);
  });
});
