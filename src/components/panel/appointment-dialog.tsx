"use client";

import type { AppointmentStatus } from "@prisma/client";
import { Ban, CalendarClock, Check, CheckCheck, Copy, History, MessageCircle, Share2, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatMoney } from "@/lib/money";
import { formatWhatsapp } from "@/lib/phone";
import { allowedTransitions, canReschedule, requiresStarted, STATUS_LABEL } from "@/lib/status";
import { formatDateBR, formatDateLongBR, formatDateTimeBR, formatTimeBR } from "@/lib/time";
import { appointmentSummaryText, buildWhatsappLink, professionalToCustomerMessage } from "@/lib/whatsapp";
import type { AppointmentRow } from "@/server/appointments/dto";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog, useConfirm } from "@/components/ui/dialog";
import { Skeleton, StatusBadge } from "@/components/ui/misc";
import { ReschedulePanel } from "./reschedule-panel";

interface Audit {
  id: string;
  action: "CRIADO" | "STATUS_ALTERADO" | "REMARCADO";
  previousStatus: AppointmentStatus | null;
  newStatus: AppointmentStatus | null;
  previousStartAt: string | null;
  newStartAt: string | null;
  changedBy: string;
  createdAt: string;
}

const ACTION_META: Partial<Record<AppointmentStatus, { label: string; icon: typeof Check; variant: "primary" | "outline" | "danger" }>> = {
  CONFIRMADO: { label: "Confirmar", icon: Check, variant: "primary" },
  CONCLUIDO: { label: "Marcar concluído", icon: CheckCheck, variant: "outline" },
  NAO_COMPARECEU: { label: "Não compareceu", icon: UserX, variant: "outline" },
  CANCELADO: { label: "Cancelar", icon: Ban, variant: "danger" },
};

interface Props {
  appointment: AppointmentRow | null;
  timezone: string;
  professionalName: string;
  onClose: () => void;
}

export function AppointmentDialog({ appointment: a, timezone, professionalName, onClose }: Props) {
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [status, setStatus] = useState<AppointmentStatus | null>(a?.status ?? null);
  const [busy, setBusy] = useState<AppointmentStatus | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [audits, setAudits] = useState<Audit[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setStatus(a?.status ?? null);
    setRescheduling(false);
    setShowHistory(false);
    setAudits(null);
  }, [a]);

  useEffect(() => {
    if (!a || !showHistory || audits) return;
    apiFetch<{ appointment: { audits: Audit[] } }>(`/api/admin/appointments/${a.id}`)
      .then((d) => setAudits(d.appointment.audits))
      .catch((e) => toast.error(errorMessage(e)));
  }, [a, showHistory, audits]);

  if (!a || !status) return null;

  const start = new Date(a.startAt);
  const started = start.getTime() <= Date.now();
  const msgData = {
    serviceName: a.serviceName,
    dateLabel: formatDateBR(start, timezone),
    timeLabel: formatTimeBR(start, timezone),
    professionalName,
    customerName: a.customer.name,
  };
  const summary = appointmentSummaryText({
    ...msgData,
    customerPhone: formatWhatsapp(a.customer.whatsapp),
    statusLabel: STATUS_LABEL[status],
    priceLabel: formatMoney(a.price),
  });
  const anonymized = a.customer.whatsapp.startsWith("anon-");

  const changeStatus = async (to: AppointmentStatus) => {
    if (to === "CANCELADO") {
      const ok = await confirm({
        title: "Cancelar atendimento?",
        description: `O horário de ${formatDateTimeBR(start, timezone)} será liberado para outras clientes. Esta ação não pode ser desfeita.`,
        confirmLabel: "Cancelar atendimento",
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(to);
    try {
      await apiFetch(`/api/admin/appointments/${a.id}/status`, { body: { status: to } });
      setStatus(to);
      setAudits(null);
      toast.success(`Status alterado para "${STATUS_LABEL[to]}".`);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast.success("Dados copiados.");
    } catch {
      toast.error("Não foi possível copiar neste navegador.");
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Agendamento", text: summary });
      } catch {
        /* compartilhamento cancelado pela usuária */
      }
    } else {
      await copy();
    }
  };

  const transitions = allowedTransitions(status).filter((t) => !requiresStarted(t) || started);

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()} title={a.customer.name} description={a.serviceName} size="md">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm capitalize">
              <CalendarClock className="size-4 text-gold-deep" />
              {formatDateLongBR(start, timezone)} · {formatTimeBR(start, timezone)}–{formatTimeBR(new Date(a.endAt), timezone)}
            </p>
            <StatusBadge status={status} />
          </div>

          <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-nude-soft p-4 text-sm">
            <div>
              <dt className="text-cocoa-muted">WhatsApp</dt>
              <dd className="font-medium">{anonymized ? "—" : formatWhatsapp(a.customer.whatsapp)}</dd>
            </div>
            <div>
              <dt className="text-cocoa-muted">Valor</dt>
              <dd className="font-medium">{formatMoney(a.price)}</dd>
            </div>
            {a.customerNotes && (
              <div className="col-span-2">
                <dt className="text-cocoa-muted">Observações da cliente</dt>
                <dd className="whitespace-pre-line">{a.customerNotes}</dd>
              </div>
            )}
          </dl>

          <div className="grid grid-cols-3 gap-2">
            {!anonymized && (
              <a
                href={buildWhatsappLink(a.customer.whatsapp, professionalToCustomerMessage(msgData))}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("whatsapp", "sm", "rounded-xl")}
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            )}
            <Button variant="outline" size="sm" className="rounded-xl" onClick={copy}>
              <Copy className="size-4" /> Copiar
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={share}>
              <Share2 className="size-4" /> Compartilhar
            </Button>
          </div>

          {rescheduling ? (
            <ReschedulePanel
              appointmentId={a.id}
              timezone={timezone}
              initialStartAt={a.startAt}
              onCancel={() => setRescheduling(false)}
              onDone={() => {
                setRescheduling(false);
                router.refresh();
                onClose();
              }}
            />
          ) : (
            (transitions.length > 0 || canReschedule(status)) && (
              <div className="flex flex-wrap gap-2">
                {transitions.map((t) => {
                  const meta = ACTION_META[t];
                  if (!meta) return null;
                  return (
                    <Button key={t} variant={meta.variant} size="sm" loading={busy === t} disabled={!!busy} onClick={() => changeStatus(t)}>
                      <meta.icon className="size-4" /> {meta.label}
                    </Button>
                  );
                })}
                {canReschedule(status) && (
                  <Button variant="secondary" size="sm" disabled={!!busy} onClick={() => setRescheduling(true)}>
                    <CalendarClock className="size-4" /> Remarcar
                  </Button>
                )}
              </div>
            )
          )}

          <div>
            <button type="button" onClick={() => setShowHistory((v) => !v)} className="flex items-center gap-2 text-sm font-medium text-cocoa-soft hover:text-cocoa">
              <History className="size-4" /> {showHistory ? "Ocultar histórico" : "Ver histórico de alterações"}
            </button>
            {showHistory && (
              <ol className="mt-3 space-y-3 border-l-2 border-line pl-4 text-sm">
                {!audits && <Skeleton className="h-16" />}
                {audits?.map((h) => (
                  <li key={h.id}>
                    <p className="font-medium">
                      {h.action === "CRIADO" && "Agendamento criado"}
                      {h.action === "STATUS_ALTERADO" && `${h.previousStatus ? STATUS_LABEL[h.previousStatus] : "—"} → ${h.newStatus ? STATUS_LABEL[h.newStatus] : "—"}`}
                      {h.action === "REMARCADO" &&
                        `Remarcado: ${h.previousStartAt ? formatDateTimeBR(new Date(h.previousStartAt), timezone) : "—"} → ${h.newStartAt ? formatDateTimeBR(new Date(h.newStartAt), timezone) : "—"}`}
                    </p>
                    <p className="text-xs text-cocoa-muted">
                      {formatDateTimeBR(new Date(h.createdAt), timezone)} · {h.changedBy}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </Dialog>
      {confirmDialog}
    </>
  );
}
