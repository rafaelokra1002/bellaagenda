"use client";

import { AlertTriangle, CalendarOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch, ApiClientError, errorMessage } from "@/lib/api-client";
import { addDays, formatDateTimeBR, toLocalDate } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/dialog";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { Card } from "@/components/ui/misc";

interface Block {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
}

export function BlocksManager({ blocks, timezone }: { blocks: Block[]; timezone: string }) {
  const router = useRouter();
  const today = toLocalDate(new Date(), timezone);
  const { confirm, dialog } = useConfirm();
  const [allDay, setAllDay] = useState(true);
  const [form, setForm] = useState({ startDate: today, startTime: "08:00", endDate: today, endTime: "18:00", reason: "" });
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState<Array<{ id: string; label: string }>>([]);

  const payload = (force: boolean) =>
    allDay
      ? { startDate: form.startDate, startTime: "00:00", endDate: addDays(form.endDate, 1), endTime: "00:00", reason: form.reason, force }
      : { ...form, force };

  const submit = async (force = false) => {
    if (form.endDate < form.startDate) return toast.error("A data final deve ser igual ou posterior à inicial.");
    setSaving(true);
    try {
      await apiFetch("/api/admin/blocks", { body: payload(force) });
      toast.success("Período bloqueado. Esses horários não aparecem mais para agendamento.");
      setConflicts([]);
      setForm((f) => ({ ...f, reason: "" }));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "CONFLICT" && (err.details as { conflicts?: unknown })?.conflicts) {
        setConflicts((err.details as { conflicts: Array<{ id: string; label: string }> }).conflicts);
      } else toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b: Block) => {
    if (!(await confirm({ title: "Remover bloqueio?", description: "Os horários deste período voltarão a ficar disponíveis.", confirmLabel: "Remover" }))) return;
    try {
      await apiFetch(`/api/admin/blocks/${b.id}`, { method: "DELETE" });
      toast.success("Bloqueio removido.");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Card className="p-5">
      <h2 className="font-display text-2xl font-semibold">Bloqueios, folgas e férias</h2>
      <p className="mb-4 mt-1 text-sm text-cocoa-muted">Bloqueie um horário específico ou dias inteiros. Agendamentos existentes não são cancelados automaticamente.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(false);
        }}
        className="grid gap-3 rounded-2xl bg-nude-soft p-4 sm:grid-cols-2"
      >
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <Checkbox checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> Dia(s) inteiro(s)
        </label>
        <Field label="De">
          {(id) => (
            <div className="flex gap-2">
              <Input id={id} type="date" min={today} value={form.startDate} required onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value, endDate: f.endDate < e.target.value ? e.target.value : f.endDate }))} />
              {!allDay && <Input type="time" aria-label="Hora inicial" value={form.startTime} required onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} className="w-32" />}
            </div>
          )}
        </Field>
        <Field label="Até">
          {(id) => (
            <div className="flex gap-2">
              <Input id={id} type="date" min={form.startDate} value={form.endDate} required onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              {!allDay && <Input type="time" aria-label="Hora final" value={form.endTime} required onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} className="w-32" />}
            </div>
          )}
        </Field>
        <Field label="Motivo (opcional)" className="sm:col-span-2">
          {(id) => <Input id={id} maxLength={120} placeholder="Ex.: Férias, curso, consulta médica" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />}
        </Field>
        {conflicts.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4" /> Há atendimentos marcados neste período
            </p>
            <ul className="mt-1 list-disc pl-5">
              {conflicts.map((c) => (
                <li key={c.id}>{c.label}</li>
              ))}
            </ul>
            <p className="mt-2">Se bloquear mesmo assim, eles continuarão marcados; remarque ou cancele em Agendamentos.</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setConflicts([])}>
                Voltar
              </Button>
              <Button size="sm" onClick={() => submit(true)} loading={saving}>
                Bloquear mesmo assim
              </Button>
            </div>
          </div>
        )}
        {conflicts.length === 0 && (
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" loading={saving}>
              <CalendarOff className="size-4" /> Bloquear período
            </Button>
          </div>
        )}
      </form>

      <h3 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wider text-cocoa-muted">Bloqueios ativos</h3>
      {blocks.length === 0 ? (
        <p className="text-sm text-cocoa-muted">Nenhum bloqueio futuro.</p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">
                  {formatDateTimeBR(new Date(b.startAt), timezone)} → {formatDateTimeBR(new Date(b.endAt), timezone)}
                </p>
                {b.reason && <p className="text-cocoa-muted">{b.reason}</p>}
              </div>
              <button type="button" onClick={() => remove(b)} className="rounded-full p-2 text-cocoa-muted hover:bg-rose-50 hover:text-rose-700" aria-label="Remover bloqueio">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {dialog}
    </Card>
  );
}
