import type { AppointmentStatus } from "@prisma/client";

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDENTE: "Pendente",
  CONFIRMADO: "Confirmado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  NAO_COMPARECEU: "Não compareceu",
};

export const STATUS_STYLE: Record<AppointmentStatus, string> = {
  PENDENTE: "bg-amber-50 text-amber-800 ring-amber-200",
  CONFIRMADO: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  CONCLUIDO: "bg-sky-50 text-sky-800 ring-sky-200",
  CANCELADO: "bg-stone-100 text-stone-600 ring-stone-200",
  NAO_COMPARECEU: "bg-rose-50 text-rose-800 ring-rose-200",
};

/** Status que ocupam a agenda (todos menos cancelado). */
export const BLOCKING_STATUSES: AppointmentStatus[] = ["PENDENTE", "CONFIRMADO", "CONCLUIDO", "NAO_COMPARECEU"];
/** Status de um atendimento que ainda vai acontecer. */
export const ACTIVE_STATUSES: AppointmentStatus[] = ["PENDENTE", "CONFIRMADO"];

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDENTE: ["CONFIRMADO", "CANCELADO", "CONCLUIDO", "NAO_COMPARECEU"],
  CONFIRMADO: ["CANCELADO", "CONCLUIDO", "NAO_COMPARECEU"],
  // Permite corrigir um registro marcado errado após o atendimento.
  CONCLUIDO: ["NAO_COMPARECEU"],
  NAO_COMPARECEU: ["CONCLUIDO"],
  // Cancelado é final: o horário já foi liberado e pode ter sido reocupado.
  CANCELADO: [],
};

export function allowedTransitions(from: AppointmentStatus): AppointmentStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Concluído/não compareceu só fazem sentido depois do início do atendimento. */
export function requiresStarted(to: AppointmentStatus): boolean {
  return to === "CONCLUIDO" || to === "NAO_COMPARECEU";
}

export function canReschedule(status: AppointmentStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}
