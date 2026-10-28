"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatMoney } from "@/lib/money";
import { formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import { serviceSchema, type ServiceValues } from "@/validation/admin";
import type { ServiceDTO } from "@/server/catalog/service";
import { Button } from "@/components/ui/button";
import { Dialog, useConfirm } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";

const toValues = (s: ServiceDTO): ServiceValues => ({
  name: s.name,
  description: s.description ?? "",
  price: s.price.replace(".", ","),
  durationMinutes: s.durationMinutes,
  bufferMinutes: s.bufferMinutes,
  imageUrl: s.imageUrl ?? "",
  isActive: s.isActive,
});

const EMPTY: ServiceValues = { name: "", description: "", price: "", durationMinutes: 60, bufferMinutes: null, imageUrl: "", isActive: true };

export function ServicesManager({ initial, defaultBuffer }: { initial: ServiceDTO[]; defaultBuffer: number }) {
  const router = useRouter();
  const [services, setServices] = useState(initial);
  const [editing, setEditing] = useState<ServiceDTO | "new" | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const save = async (values: ServiceValues) => {
    const isNew = editing === "new";
    const url = isNew ? "/api/admin/services" : `/api/admin/services/${(editing as ServiceDTO).id}`;
    const { service } = await apiFetch<{ service: ServiceDTO }>(url, { method: isNew ? "POST" : "PATCH", body: values });
    setServices((list) => (isNew ? [...list, service] : list.map((s) => (s.id === service.id ? { ...service, appointmentCount: s.appointmentCount } : s))));
    toast.success(isNew ? "Serviço criado." : "Serviço atualizado.");
    setEditing(null);
    router.refresh();
  };

  const toggle = async (s: ServiceDTO) => {
    setTogglingId(s.id);
    try {
      const { service } = await apiFetch<{ service: ServiceDTO }>(`/api/admin/services/${s.id}`, { method: "PATCH", body: { ...toValues(s), isActive: !s.isActive } });
      setServices((list) => list.map((x) => (x.id === s.id ? { ...service, appointmentCount: x.appointmentCount } : x)));
      toast.success(service.isActive ? "Serviço ativado na página pública." : "Serviço desativado: não aparece mais para agendamento.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const remove = async (s: ServiceDTO) => {
    const ok = await confirm({ title: "Excluir serviço?", description: `"${s.name}" será excluído definitivamente.`, confirmLabel: "Excluir", danger: true });
    if (!ok) return;
    try {
      await apiFetch(`/api/admin/services/${s.id}`, { method: "DELETE" });
      setServices((list) => list.filter((x) => x.id !== s.id));
      toast.success("Serviço excluído.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Novo serviço
        </Button>
      </div>
      {services.length === 0 ? (
        <EmptyState icon={<Scissors className="size-8" />} title="Nenhum serviço cadastrado" action={<Button onClick={() => setEditing("new")}>Cadastrar serviço</Button>}>
          Cadastre seus serviços para que apareçam na sua página de agendamento.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {services.map((s) => (
            <li key={s.id} className={cn("flex flex-col rounded-2xl border border-line bg-white p-4 shadow-soft", !s.isActive && "opacity-70")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{s.name}</p>
                  {s.description && <p className="mt-0.5 line-clamp-2 text-sm text-cocoa-muted">{s.description}</p>}
                </div>
                <p className="shrink-0 font-display text-xl font-semibold">{formatMoney(s.price)}</p>
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cocoa-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" /> {formatDuration(s.durationMinutes)}
                </span>
                <span>Intervalo após: {s.bufferMinutes === null ? `padrão (${defaultBuffer} min)` : `${s.bufferMinutes} min`}</span>
                {!s.isActive && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">Inativo</span>}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
                <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                  <Pencil className="size-4" /> Editar
                </Button>
                <Button size="sm" variant="ghost" loading={togglingId === s.id} onClick={() => toggle(s)}>
                  {s.isActive ? "Desativar" : "Ativar"}
                </Button>
                <Button size="sm" variant="ghost" className="ml-auto text-rose-700" onClick={() => remove(s)} aria-label={`Excluir ${s.name}`}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <ServiceForm
          title={editing === "new" ? "Novo serviço" : "Editar serviço"}
          initial={editing === "new" ? EMPTY : toValues(editing)}
          defaultBuffer={defaultBuffer}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
      {dialog}
    </>
  );
}

function ServiceForm({
  title,
  initial,
  defaultBuffer,
  onSubmit,
  onClose,
}: {
  title: string;
  initial: ServiceValues;
  defaultBuffer: number;
  onSubmit: (v: ServiceValues) => Promise<void>;
  onClose: () => void;
}) {
  const form = useForm<ServiceValues>({ resolver: zodResolver(serviceSchema), defaultValues: initial });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (v) => {
    try {
      await onSubmit(v);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="service-form" loading={isSubmitting}>
            Salvar
          </Button>
        </>
      }
    >
      <form id="service-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label="Nome" error={errors.name?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.name} {...form.register("name")} />}
        </Field>
        <Field label="Descrição" error={errors.description?.message}>
          {(id, d) => <Textarea id={id} aria-describedby={d} maxLength={500} {...form.register("description")} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço (R$)" error={errors.price?.message}>
            {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.price} inputMode="decimal" placeholder="120,00" {...form.register("price")} />}
          </Field>
          <Field label="Duração (min)" error={errors.durationMinutes?.message}>
            {(id, d) => (
              <Input id={id} aria-describedby={d} aria-invalid={!!errors.durationMinutes} type="number" inputMode="numeric" min={5} step={5} {...form.register("durationMinutes", { valueAsNumber: true })} />
            )}
          </Field>
        </div>
        <Field label="Intervalo após o atendimento" hint="Tempo reservado para limpeza/preparação antes da próxima cliente." error={errors.bufferMinutes?.message}>
          {(id, d) => (
            <Select id={id} aria-describedby={d} {...form.register("bufferMinutes", { setValueAs: (v: string | number | null) => (v === "" || v === null ? null : Number(v)) })}>
              <option value="">Usar padrão da agenda ({defaultBuffer} min)</option>
              {[0, 5, 10, 15, 20, 30, 45, 60].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Imagem (opcional)" hint="Endereço https de uma foto do serviço." error={errors.imageUrl?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} type="url" placeholder="https://…" {...form.register("imageUrl")} />}
        </Field>
        <label className="flex items-center gap-3 text-sm">
          <Checkbox {...form.register("isActive")} /> Disponível para agendamento online
        </label>
      </form>
    </Dialog>
  );
}
