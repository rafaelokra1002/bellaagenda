"use client";

import { AlertTriangle, Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { WEEKDAY_NAMES } from "@/lib/time";
import { cn } from "@/lib/utils";
import { findInvalidPeriods } from "@/server/availability/engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Card } from "@/components/ui/misc";

type P = { startTime: string; endTime: string };
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function HoursEditor({ initial }: { initial: Array<{ dayOfWeek: number; startTime: string; endTime: string }> }) {
  const [days, setDays] = useState<Record<number, P[]>>(() => {
    const map: Record<number, P[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const h of initial) map[h.dayOfWeek]!.push({ startTime: h.startTime, endTime: h.endTime });
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState<Array<{ id: string; label: string }>>([]);

  const flat = Object.entries(days).flatMap(([d, ps]) => ps.map((p) => ({ dayOfWeek: Number(d), ...p })));
  const problem = findInvalidPeriods(flat);

  const setPeriod = (d: number, i: number, patch: Partial<P>) => setDays((s) => ({ ...s, [d]: s[d]!.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));
  const add = (d: number) =>
    setDays((s) => {
      const last = s[d]!.at(-1);
      const next = last ? { startTime: last.endTime < "14:00" ? "14:00" : last.endTime, endTime: "18:00" } : { startTime: "08:00", endTime: "12:00" };
      return { ...s, [d]: [...s[d]!, next] };
    });
  const remove = (d: number, i: number) => setDays((s) => ({ ...s, [d]: s[d]!.filter((_, j) => j !== i) }));
  const copyToWeekdays = (d: number) => {
    setDays((s) => ({ ...s, ...Object.fromEntries([1, 2, 3, 4, 5].map((w) => [w, s[d]!.map((p) => ({ ...p }))])) }));
    toast.success(`Horários de ${WEEKDAY_NAMES[d]} copiados para segunda a sexta.`);
  };

  const save = async () => {
    if (problem) return toast.error(problem);
    setSaving(true);
    try {
      const res = await apiFetch<{ conflicts: Array<{ id: string; label: string }> }>("/api/admin/schedule/hours", { method: "PUT", body: { periods: flat } });
      setConflicts(res.conflicts);
      if (res.conflicts.length) toast.warning("Horários salvos, mas há atendimentos fora do novo expediente.");
      else toast.success("Horários de atendimento salvos.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="font-display text-2xl font-semibold">Expediente</h2>
      <p className="mb-4 mt-1 text-sm text-cocoa-muted">Para o intervalo de almoço, use dois períodos no mesmo dia (ex.: 08:00–12:00 e 14:00–18:00).</p>
      <div className="divide-y divide-line">
        {ORDER.map((d) => {
          const periods = days[d]!;
          return (
            <div key={d} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
              <div className="flex w-44 shrink-0 items-center justify-between sm:block">
                <p className="font-medium">{WEEKDAY_NAMES[d]}</p>
                <p className={cn("text-xs", periods.length ? "text-emerald-700" : "text-cocoa-muted")}>{periods.length ? "Atende" : "Fechado"}</p>
              </div>
              <div className="flex-1 space-y-2">
                {periods.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input type="time" aria-label="Início" value={p.startTime} onChange={(e) => setPeriod(d, i, { startTime: e.target.value })} className="w-32" />
                    <span className="text-cocoa-muted">às</span>
                    <Input type="time" aria-label="Fim" value={p.endTime} onChange={(e) => setPeriod(d, i, { endTime: e.target.value })} className="w-32" />
                    <button type="button" onClick={() => remove(d, i)} className="rounded-full p-2 text-cocoa-muted hover:bg-rose-50 hover:text-rose-700" aria-label="Remover período">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" onClick={() => add(d)}>
                    <Plus className="size-4" /> {periods.length ? "Adicionar período" : "Abrir este dia"}
                  </Button>
                  {periods.length > 0 && d >= 1 && d <= 5 && (
                    <Button size="sm" variant="ghost" onClick={() => copyToWeekdays(d)}>
                      <Copy className="size-4" /> Copiar para seg–sex
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {problem && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">{problem}</p>}
      {conflicts.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4" /> Atendimentos fora do novo expediente
          </p>
          <p className="mt-1">Eles foram mantidos. Remarque ou cancele em Agendamentos, se necessário.</p>
          <ul className="mt-2 list-disc pl-5">
            {conflicts.map((c) => (
              <li key={c.id}>{c.label}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <Button onClick={save} loading={saving} disabled={!!problem}>
          Salvar expediente
        </Button>
      </div>
    </Card>
  );
}
