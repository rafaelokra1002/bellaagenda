/**
 * Testa os Route Handlers reais: autenticação, autorização, isolamento,
 * proteção de origem, validação e limite de requisições.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { addDays, dayOfWeek, toLocalDate } from "@/lib/time";
import * as services from "@/app/api/admin/services/route";
import * as serviceById from "@/app/api/admin/services/[id]/route";
import * as apptStatus from "@/app/api/admin/appointments/[id]/status/route";
import * as apptDetail from "@/app/api/admin/appointments/[id]/route";
import * as publicAvailability from "@/app/api/public/[slug]/availability/route";
import * as publicAppointments from "@/app/api/public/[slug]/appointments/route";
import { booking, ctx, makeProfessional, req, resetDb, TZ } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const serviceBody = { name: "Novo", description: "", price: "50,00", durationMinutes: 45, bufferMinutes: null, imageUrl: "", isActive: true };

/** Próximo dia útil a pelo menos 3 dias de hoje (no fuso da profissional). */
function futureWeekday() {
  let d = addDays(toLocalDate(new Date(), TZ), 3);
  while (dayOfWeek(d) === 0 || dayOfWeek(d) === 6) d = addDays(d, 1);
  return d;
}

describe("autorização do painel", () => {
  it("recusa acesso sem sessão ou com sessão inválida", async () => {
    expect((await services.GET(req("/api/admin/services"), ctx())).status).toBe(401);
    expect((await services.GET(req("/api/admin/services", { token: "token-falso" }), ctx())).status).toBe(401);
  });

  it("recusa sessão expirada", async () => {
    const a = await makeProfessional();
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await services.GET(req("/api/admin/services", { token: a.token }), ctx())).status).toBe(401);
  });

  it("lista somente os serviços da própria profissional", async () => {
    const a = await makeProfessional();
    const b = await makeProfessional();
    const res = await services.GET(req("/api/admin/services", { token: a.token }), ctx());
    const { services: list } = (await res.json()) as { services: Array<{ id: string }> };
    expect(list.map((s) => s.id).sort()).toEqual([a.longService.id, a.shortService.id].sort());
    expect(list.some((s) => s.id === b.shortService.id)).toBe(false);
  });

  it("ignora professionalId enviado pelo navegador e usa o da sessão", async () => {
    const a = await makeProfessional();
    const b = await makeProfessional();
    const res = await services.POST(req("/api/admin/services", { token: a.token, body: { ...serviceBody, professionalId: b.professional.id } }), ctx());
    expect(res.status).toBe(201);
    expect(await prisma.service.count({ where: { professionalId: b.professional.id } })).toBe(2);
    expect(await prisma.service.count({ where: { professionalId: a.professional.id } })).toBe(3);
  });

  it("não permite editar, excluir ou ver dados de outra profissional", async () => {
    const a = await makeProfessional();
    const b = await makeProfessional();
    expect((await serviceById.PATCH(req(`/api/admin/services/${b.shortService.id}`, { method: "PATCH", token: a.token, body: serviceBody }), ctx({ id: b.shortService.id }))).status).toBe(404);
    expect((await serviceById.DELETE(req(`/api/admin/services/${b.shortService.id}`, { method: "DELETE", token: a.token }), ctx({ id: b.shortService.id }))).status).toBe(404);

    const day = futureWeekday();
    const startAt = (await (await publicAvailability.GET(req(`/api/public/${b.professional.slug}/availability?serviceId=${b.shortService.id}&date=${day}`, { ip: "10.0.0.1" }), ctx({ slug: b.professional.slug }))).json()) as { slots: Array<{ startAt: string }> };
    await publicAppointments.POST(req(`/api/public/${b.professional.slug}/appointments`, { ip: "10.0.0.1", body: booking(b.shortService.id, new Date(startAt.slots[0]!.startAt), 1) }), ctx({ slug: b.professional.slug }));
    const apptB = await prisma.appointment.findFirstOrThrow({ where: { professionalId: b.professional.id } });

    expect((await apptDetail.GET(req(`/api/admin/appointments/${apptB.id}`, { token: a.token }), ctx({ id: apptB.id }))).status).toBe(404);
    expect((await apptStatus.POST(req(`/api/admin/appointments/${apptB.id}/status`, { token: a.token, body: { status: "CANCELADO" } }), ctx({ id: apptB.id }))).status).toBe(404);
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: apptB.id } })).status).toBe("PENDENTE");
    // A dona consegue
    expect((await apptStatus.POST(req(`/api/admin/appointments/${apptB.id}/status`, { token: b.token, body: { status: "CONFIRMADO" } }), ctx({ id: apptB.id }))).status).toBe(200);
  });

  it("bloqueia escrita vinda de outra origem (CSRF)", async () => {
    const a = await makeProfessional();
    const res = await services.POST(req("/api/admin/services", { token: a.token, body: serviceBody, origin: "https://site-malicioso.com" }), ctx());
    expect(res.status).toBe(403);
  });

  it("valida o corpo com Zod e não vaza detalhes internos", async () => {
    const a = await makeProfessional();
    const res = await services.POST(req("/api/admin/services", { token: a.token, body: { ...serviceBody, price: "abc" } }), ctx());
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("VALIDATION");
    expect(body.error.message).toMatch(/Valor inválido/);
  });

  it("não exclui serviço com histórico (exige desativação)", async () => {
    const a = await makeProfessional();
    const day = futureWeekday();
    const { slots } = (await (await publicAvailability.GET(req(`/api/public/${a.professional.slug}/availability?serviceId=${a.shortService.id}&date=${day}`, { ip: "10.0.0.2" }), ctx({ slug: a.professional.slug }))).json()) as { slots: Array<{ startAt: string }> };
    await publicAppointments.POST(req(`/api/public/${a.professional.slug}/appointments`, { ip: "10.0.0.2", body: booking(a.shortService.id, new Date(slots[0]!.startAt), 1) }), ctx({ slug: a.professional.slug }));
    const res = await serviceById.DELETE(req(`/api/admin/services/${a.shortService.id}`, { method: "DELETE", token: a.token }), ctx({ id: a.shortService.id }));
    expect(res.status).toBe(409);
    expect((await serviceById.DELETE(req(`/api/admin/services/${a.longService.id}`, { method: "DELETE", token: a.token }), ctx({ id: a.longService.id }))).status).toBe(200);
  });
});

describe("API pública", () => {
  it("fluxo completo: consulta horários, agenda e o horário some da lista", async () => {
    const a = await makeProfessional();
    const day = futureWeekday();
    const url = `/api/public/${a.professional.slug}/availability?serviceId=${a.longService.id}&date=${day}`;
    const before = (await (await publicAvailability.GET(req(url, { ip: "10.0.1.1" }), ctx({ slug: a.professional.slug }))).json()) as { slots: Array<{ time: string; startAt: string }> };
    expect(before.slots[0]!.time).toBe("08:00");

    const res = await publicAppointments.POST(req(`/api/public/${a.professional.slug}/appointments`, { ip: "10.0.1.1", body: booking(a.longService.id, new Date(before.slots[0]!.startAt), 1) }), ctx({ slug: a.professional.slug }));
    expect(res.status).toBe(201);
    const { redirectTo } = (await res.json()) as { redirectTo: string };
    expect(redirectTo).toMatch(new RegExp(`^/agendar/${a.professional.slug}/confirmacao\\?codigo=`));

    const after = (await (await publicAvailability.GET(req(url, { ip: "10.0.1.1" }), ctx({ slug: a.professional.slug }))).json()) as { slots: Array<{ time: string }> };
    expect(after.slots.map((s) => s.time)).not.toContain("08:00");
    expect(after.slots.map((s) => s.time)).not.toContain("09:30");

    // Segunda tentativa no mesmo horário → 409 com mensagem amigável
    const again = await publicAppointments.POST(req(`/api/public/${a.professional.slug}/appointments`, { ip: "10.0.1.2", body: booking(a.longService.id, new Date(before.slots[0]!.startAt), 2) }), ctx({ slug: a.professional.slug }));
    expect(again.status).toBe(409);
    expect(((await again.json()) as { error: { code: string } }).error.code).toBe("SLOT_UNAVAILABLE");
  });

  it("não expõe dados de clientes na disponibilidade", async () => {
    const a = await makeProfessional();
    const day = futureWeekday();
    const res = await publicAvailability.GET(req(`/api/public/${a.professional.slug}/availability?serviceId=${a.shortService.id}&date=${day}`, { ip: "10.0.2.1" }), ctx({ slug: a.professional.slug }));
    const text = await res.text();
    expect(text).not.toMatch(/customer|whatsapp|name/i);
  });

  it("retorna 404 para profissional inativa ou slug inexistente", async () => {
    const a = await makeProfessional();
    await prisma.professional.update({ where: { id: a.professional.id }, data: { isActive: false } });
    const day = futureWeekday();
    expect((await publicAvailability.GET(req(`/api/public/${a.professional.slug}/availability?serviceId=${a.shortService.id}&date=${day}`, { ip: "10.0.3.1" }), ctx({ slug: a.professional.slug }))).status).toBe(404);
    expect((await publicAvailability.GET(req(`/api/public/nao-existe/availability?serviceId=${a.shortService.id}&date=${day}`, { ip: "10.0.3.1" }), ctx({ slug: "nao-existe" }))).status).toBe(404);
  });

  it("limita agendamentos excessivos do mesmo IP", async () => {
    const a = await makeProfessional({ allWeek: true });
    const statuses: number[] = [];
    // Cada tentativa inválida (horário inexistente) ainda conta no limite por IP.
    for (let i = 0; i < 8; i++) {
      const r = await publicAppointments.POST(
        req(`/api/public/${a.professional.slug}/appointments`, { ip: "10.9.9.9", body: booking(a.shortService.id, new Date("2031-01-01T03:07:00Z"), 500 + i) }),
        ctx({ slug: a.professional.slug }),
      );
      statuses.push(r.status);
    }
    expect(statuses.slice(0, 6).every((s) => s === 409)).toBe(true);
    expect(statuses.slice(6)).toEqual([429, 429]);
  });

  it("rejeita robôs que preenchem o honeypot", async () => {
    const a = await makeProfessional();
    const r = await publicAppointments.POST(
      req(`/api/public/${a.professional.slug}/appointments`, { ip: "10.0.4.1", body: { ...booking(a.shortService.id, new Date(), 1), website: "http://spam" } }),
      ctx({ slug: a.professional.slug }),
    );
    expect(r.status).toBe(400);
  });
});
