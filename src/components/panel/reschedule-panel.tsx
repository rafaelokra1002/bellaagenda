"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch, ApiClientError, errorMessage } from "@/lib/api-client";
import { toLocalDate } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { SlotGrid } from "@/components/booking/slot-grid";
import type { SlotOption } from "@/components/booking/types";

interface Props {
  appointmentId: string;
  timezone: string;
  initialStartAt: string;
  onDone: () => void;
  onCancel: () => void;
}

export function ReschedulePanel({ appointmentId, timezone, initialStartAt, onDone, onCancel }: Props) {
  const today = toLocalDate(new Date(), timezone);
  const initialDate = toLocalDate(new Date(initialStartAt), timezone);
  const [date, setDate] = useState(initialDate < today ? today : initialDate);
  const [slots, setSlots] = useState<SlotOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SlotOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setSelected(null);
    apiFetch<{ slots: SlotOption[] }>(`/api/admin/availability?${new URLSearchParams({ appointmentId, date })}`, { signal: ctrl.signal })
      .then((d) => setSlots(d.slots))
      .catch((e) => {
        if (!(e instanceof DOMException)) setError(errorMessage(e));
      })
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [appointmentId, date, reload]);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/appointments/${appointmentId}/reschedule`, { body: { startAt: selected.startAt } });
      toast.success(`Remarcado para ${date.split("-").reverse().join("/")} às ${selected.time}.`);
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
      if (err instanceof ApiClientError && err.code === "SLOT_UNAVAILABLE") setReload((n) => n + 1);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl bg-nude-soft p-4">
      <p className="font-semibold">Remarcar atendimento</p>
      <Field label="Nova data">{(id) => <Input id={id} type="date" min={today} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />}</Field>
      <SlotGrid slots={slots} loading={loading} error={error} selected={selected?.startAt ?? null} onSelect={setSelected} onRetry={() => setReload((n) => n + 1)} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Voltar
        </Button>
        <Button onClick={save} disabled={!selected} loading={saving}>
          Confirmar remarcação
        </Button>
      </div>
    </div>
  );
}
