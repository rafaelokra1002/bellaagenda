"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { apiFetch, ApiClientError, errorMessage } from "@/lib/api-client";
import { formatMoney } from "@/lib/money";
import { maskWhatsappInput } from "@/lib/phone";
import { formatDuration, formatLocalDateBR, toLocalDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { customerFormSchema, type CustomerFormValues } from "@/validation/booking";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { DatePicker } from "./date-picker";
import { SlotGrid } from "./slot-grid";
import type { BookingProfessional, BookingService, SlotOption } from "./types";

type Step = 1 | 2 | 3 | 4;
const STEPS = ["Serviço", "Data e horário", "Seus dados", "Confirmar"] as const;

interface Props {
  professional: BookingProfessional;
  services: BookingService[];
}

export function BookingFlow({ professional, services }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [service, setService] = useState<BookingService | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotOption | null>(null);
  const [slots, setSlots] = useState<SlotOption[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerFormValues | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const topRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const today = toLocalDate(new Date(), professional.timezone);

  const goTo = (s: Step) => {
    setStep(s);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const loadSlots = useCallback(
    async (svc: BookingService, d: string) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setSlotsLoading(true);
      setSlotsError(null);
      try {
        const qs = new URLSearchParams({ serviceId: svc.id, date: d });
        const data = await apiFetch<{ slots: SlotOption[] }>(`/api/public/${professional.slug}/availability?${qs}`, { signal: ctrl.signal });
        setSlots(data.slots);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSlots(null);
        setSlotsError(errorMessage(err));
      } finally {
        if (abortRef.current === ctrl) setSlotsLoading(false);
      }
    },
    [professional.slug],
  );

  useEffect(() => {
    if (service && date) void loadSlots(service, date);
  }, [service, date, loadSlots]);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: { name: "", whatsapp: "", notes: "", consent: undefined as unknown as true },
  });

  const chooseService = (s: BookingService) => {
    setService(s);
    setSlot(null);
    goTo(2);
  };

  const submit = async () => {
    if (!service || !slot || !customer || submitting) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<{ redirectTo: string }>(`/api/public/${professional.slug}/appointments`, {
        body: { ...customer, serviceId: service.id, startAt: slot.startAt, website: honeypot || undefined },
      });
      router.push(res.redirectTo);
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiClientError && err.code === "SLOT_UNAVAILABLE") {
        toast.error("Esse horário acabou de ser reservado por outra pessoa. Escolha outro horário.");
        setSlot(null);
        goTo(2);
        if (date) void loadSlots(service, date);
        return;
      }
      toast.error(errorMessage(err));
    }
  };

  const accentPrice = service ? formatMoney(service.price) : null;

  return (
    <div ref={topRef} className="scroll-mt-4">
      {/* Indicador de etapas */}
      <ol className="mb-6 flex items-center gap-2" aria-label="Etapas do agendamento">
        {STEPS.map((label, i) => {
          const n = (i + 1) as Step;
          const done = n < step;
          const current = n === step;
          return (
            <li key={label} className="flex flex-1 flex-col gap-1.5" aria-current={current ? "step" : undefined}>
              <span className={cn("h-1 rounded-full transition-colors", done || current ? "bg-[var(--accent)]" : "bg-line")} />
              <span className={cn("hidden text-xs sm:block", current ? "font-semibold text-cocoa" : "text-cocoa-muted")}>{label}</span>
            </li>
          );
        })}
      </ol>
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-gold-deep sm:hidden">
        Etapa {step} de 4 · {STEPS[step - 1]}
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 animate-fade-up" key={step}>
          {step === 1 && (
            <section aria-labelledby="h-servicos">
              <h2 id="h-servicos" className="mb-4 font-display text-2xl font-semibold">
                Escolha o serviço
              </h2>
              {services.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line bg-white p-6 text-sm text-cocoa-muted">
                  Nenhum serviço disponível para agendamento online no momento. Fale pelo WhatsApp.
                </p>
              ) : (
                <ul className="space-y-3">
                  {services.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => chooseService(s)}
                        className={cn(
                          "group flex w-full items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-gold hover:shadow-lift",
                          service?.id === s.id ? "border-gold ring-2 ring-gold/30" : "border-line",
                        )}
                      >
                        {s.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.imageUrl} alt="" className="size-16 shrink-0 rounded-xl object-cover" loading="lazy" />
                        ) : (
                          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blush text-gold-deep">
                            <Sparkles className="size-5" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{s.name}</span>
                          {s.description && <span className="mt-0.5 line-clamp-2 block text-sm text-cocoa-muted">{s.description}</span>}
                          <span className="mt-1.5 flex items-center gap-1 text-xs text-cocoa-muted">
                            <Clock className="size-3.5" /> {formatDuration(s.durationMinutes)}
                          </span>
                        </span>
                        <span className="shrink-0 text-right font-display text-xl font-semibold">{formatMoney(s.price)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {step === 2 && service && (
            <section aria-labelledby="h-data" className="space-y-5">
              <BackButton onClick={() => goTo(1)} />
              <h2 id="h-data" className="font-display text-2xl font-semibold">
                Escolha a data e o horário
              </h2>
              <DatePicker
                today={today}
                maxAdvanceDays={professional.maxAdvanceDays}
                workingWeekdays={professional.workingWeekdays}
                value={date}
                onChange={(d) => {
                  setDate(d);
                  setSlot(null);
                }}
              />
              {date && (
                <div>
                  <p className="mb-3 text-sm font-medium capitalize">{formatLocalDateBR(date, { weekday: "long", day: "numeric", month: "long" })}</p>
                  <SlotGrid
                    slots={slots}
                    loading={slotsLoading}
                    error={slotsError}
                    selected={slot?.startAt ?? null}
                    onSelect={setSlot}
                    onRetry={() => void loadSlots(service, date)}
                  />
                </div>
              )}
              <div className="sticky bottom-3 z-10 pt-2">
                <Button variant="accent" size="lg" className="w-full" disabled={!slot} onClick={() => goTo(3)}>
                  {slot ? `Continuar com ${slot.time}` : "Selecione um horário"}
                </Button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section aria-labelledby="h-dados">
              <BackButton onClick={() => goTo(2)} />
              <h2 id="h-dados" className="mb-1 mt-3 font-display text-2xl font-semibold">
                Seus dados
              </h2>
              <p className="mb-5 text-sm text-cocoa-muted">Sem cadastro. Pedimos apenas o necessário para o atendimento.</p>
              <form
                noValidate
                className="space-y-4"
                onSubmit={form.handleSubmit((values) => {
                  setCustomer(values);
                  goTo(4);
                })}
              >
                <Field label="Nome completo" error={form.formState.errors.name?.message}>
                  {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!form.formState.errors.name} autoComplete="name" {...form.register("name")} />}
                </Field>
                <Field label="WhatsApp" hint="Com DDD. Usado apenas para falar sobre o seu agendamento." error={form.formState.errors.whatsapp?.message}>
                  {(id, d) => {
                    const reg = form.register("whatsapp");
                    return (
                      <Input
                        id={id}
                        aria-describedby={d}
                        aria-invalid={!!form.formState.errors.whatsapp}
                        inputMode="tel"
                        autoComplete="tel-national"
                        placeholder="(71) 99999-8888"
                        {...reg}
                        onChange={(e) => {
                          e.target.value = maskWhatsappInput(e.target.value);
                          void reg.onChange(e);
                        }}
                      />
                    );
                  }}
                </Field>
                <Field label="Observações (opcional)" error={form.formState.errors.notes?.message}>
                  {(id, d) => <Textarea id={id} aria-describedby={d} maxLength={500} placeholder="Ex.: alergias, preferências…" {...form.register("notes")} />}
                </Field>
                {/* Honeypot anti-robô: invisível para pessoas */}
                <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label>
                    Site
                    <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                  </label>
                </div>
                <label className="flex items-start gap-3 rounded-2xl bg-nude-soft p-4 text-sm text-cocoa-soft">
                  <Checkbox className="mt-0.5" {...form.register("consent")} />
                  <span>
                    Autorizo o uso do meu nome e WhatsApp por {professional.name} exclusivamente para gerenciar este agendamento, conforme a LGPD. Posso pedir a
                    exclusão dos meus dados a qualquer momento.
                  </span>
                </label>
                {form.formState.errors.consent && (
                  <p role="alert" className="-mt-2 text-xs text-rose-700">
                    {form.formState.errors.consent.message}
                  </p>
                )}
                <Button type="submit" variant="accent" size="lg" className="w-full">
                  Revisar agendamento
                </Button>
              </form>
            </section>
          )}

          {step === 4 && service && slot && date && customer && (
            <section aria-labelledby="h-confirmar" className="space-y-5">
              <BackButton onClick={() => goTo(3)} />
              <h2 id="h-confirmar" className="font-display text-2xl font-semibold">
                Confira e confirme
              </h2>
              <dl className="divide-y divide-line rounded-2xl border border-line bg-white text-sm shadow-soft">
                <Row label="Serviço" value={service.name} />
                <Row label="Data" value={<span className="capitalize">{formatLocalDateBR(date, { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}</span>} />
                <Row label="Horário" value={`${slot.time} (duração ${formatDuration(service.durationMinutes)})`} />
                <Row label="Valor" value={accentPrice} />
                <Row label="Nome" value={customer.name} />
                <Row label="WhatsApp" value={customer.whatsapp} />
                {customer.notes ? <Row label="Observações" value={customer.notes} /> : null}
              </dl>
              <p className="flex items-start gap-2 text-xs text-cocoa-muted">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />O pagamento é combinado diretamente com a profissional. Seu horário fica reservado assim que você confirmar.
              </p>
              <Button variant="accent" size="lg" className="w-full" loading={submitting} onClick={submit}>
                <Check className="size-5" /> Confirmar agendamento
              </Button>
            </section>
          )}
        </div>

        {/* Resumo lateral (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 rounded-2xl border border-line bg-white p-5 shadow-soft">
            <p className="font-display text-xl font-semibold">Seu agendamento</p>
            {service ? (
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-cocoa-muted">Serviço</dt>
                  <dd className="font-medium">{service.name}</dd>
                </div>
                <div className="flex justify-between">
                  <span className="text-cocoa-muted">Duração</span>
                  <span>{formatDuration(service.durationMinutes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cocoa-muted">Valor</span>
                  <span className="font-semibold">{accentPrice}</span>
                </div>
                {date && (
                  <div className="flex justify-between">
                    <span className="text-cocoa-muted">Data</span>
                    <span>{formatLocalDateBR(date)}</span>
                  </div>
                )}
                {slot && (
                  <div className="flex justify-between">
                    <span className="text-cocoa-muted">Horário</span>
                    <span>{slot.time}</span>
                  </div>
                )}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-cocoa-muted">Escolha um serviço para começar.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded-full py-1 text-sm text-cocoa-muted hover:text-cocoa">
      <ArrowLeft className="size-4" /> Voltar
    </button>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3">
      <dt className="text-cocoa-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
