"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { scheduleSettingsSchema, SLOT_STEPS, type ScheduleSettingsValues } from "@/validation/admin";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Card } from "@/components/ui/misc";

const NOTICE_OPTIONS = [
  { v: 0, l: "Sem antecedência mínima" },
  { v: 30, l: "30 minutos" },
  { v: 60, l: "1 hora" },
  { v: 120, l: "2 horas" },
  { v: 240, l: "4 horas" },
  { v: 720, l: "12 horas" },
  { v: 1440, l: "1 dia" },
  { v: 2880, l: "2 dias" },
];

const TIMEZONES = [
  "America/Bahia",
  "America/Sao_Paulo",
  "America/Fortaleza",
  "America/Recife",
  "America/Maceio",
  "America/Belem",
  "America/Manaus",
  "America/Cuiaba",
  "America/Campo_Grande",
  "America/Porto_Velho",
  "America/Boa_Vista",
  "America/Rio_Branco",
  "America/Noronha",
];

export function ScheduleSettingsForm({ initial }: { initial: ScheduleSettingsValues }) {
  const form = useForm<ScheduleSettingsValues>({ resolver: zodResolver(scheduleSettingsSchema), defaultValues: initial });
  const { errors, isSubmitting } = form.formState;
  const num = { setValueAs: (v: string) => Number(v) };

  const submit = form.handleSubmit(async (v) => {
    try {
      await apiFetch("/api/admin/schedule/settings", { method: "PUT", body: v });
      toast.success("Regras da agenda salvas.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  const notice = form.watch("minNoticeMinutes");
  const tz = form.watch("timezone");

  return (
    <Card className="p-5">
      <h2 className="font-display text-2xl font-semibold">Regras da agenda</h2>
      <form onSubmit={submit} noValidate className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Intervalo entre opções de horário" hint="Ex.: 30 min → 08:00, 08:30, 09:00…" error={errors.slotStepMinutes?.message}>
          {(id, d) => (
            <Select id={id} aria-describedby={d} {...form.register("slotStepMinutes", num)}>
              {SLOT_STEPS.map((s) => (
                <option key={s} value={s}>
                  {s} minutos
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Intervalo padrão entre atendimentos" hint="Usado quando o serviço não define o próprio." error={errors.defaultBufferMinutes?.message}>
          {(id, d) => (
            <Select id={id} aria-describedby={d} {...form.register("defaultBufferMinutes", num)}>
              {[0, 5, 10, 15, 20, 30, 45, 60].map((m) => (
                <option key={m} value={m}>
                  {m} minutos
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Antecedência mínima para agendar" error={errors.minNoticeMinutes?.message}>
          {(id, d) => (
            <Select id={id} aria-describedby={d} {...form.register("minNoticeMinutes", num)}>
              {!NOTICE_OPTIONS.some((o) => o.v === notice) && <option value={notice}>{notice} minutos</option>}
              {NOTICE_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Agendar com até quantos dias de antecedência" error={errors.maxAdvanceDays?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} type="number" min={1} max={365} inputMode="numeric" {...form.register("maxAdvanceDays", { valueAsNumber: true })} />}
        </Field>
        <Field label="Fuso horário" className="sm:col-span-2" error={errors.timezone?.message}>
          {(id, d) => (
            <Select id={id} aria-describedby={d} {...form.register("timezone")}>
              {!TIMEZONES.includes(tz) && <option value={tz}>{tz}</option>}
              {TIMEZONES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("America/", "").replace("_", " ")}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" loading={isSubmitting}>
            Salvar regras
          </Button>
        </div>
      </form>
    </Card>
  );
}
