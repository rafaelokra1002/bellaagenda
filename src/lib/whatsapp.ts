/**
 * Integração inicial com WhatsApp via links oficiais wa.me.
 * Abrir um link NÃO significa que a mensagem foi enviada ou entregue —
 * a pessoa ainda precisa tocar em "enviar" no próprio WhatsApp.
 *
 * O envio automático (lembretes, notificações) ficará em
 * src/server/notifications, usando a WhatsApp Business Platform.
 */

export function buildWhatsappLink(normalizedPhone: string, message?: string): string {
  const base = `https://wa.me/${normalizedPhone.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export interface AppointmentMessageData {
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  professionalName: string;
}

export function customerConfirmationMessage(d: AppointmentMessageData): string {
  return [
    "Olá! Gostaria de confirmar meu agendamento.",
    "",
    `Serviço: ${d.serviceName}`,
    `Data: ${d.dateLabel}`,
    `Horário: ${d.timeLabel}`,
    `Profissional: ${d.professionalName}`,
  ].join("\n");
}

export function professionalToCustomerMessage(d: AppointmentMessageData & { customerName: string }): string {
  const firstName = d.customerName.split(" ")[0] ?? d.customerName;
  return [
    `Olá, ${firstName}! Aqui é ${d.professionalName}.`,
    "",
    "Sobre o seu atendimento:",
    `Serviço: ${d.serviceName}`,
    `Data: ${d.dateLabel}`,
    `Horário: ${d.timeLabel}`,
  ].join("\n");
}

export function appointmentSummaryText(d: AppointmentMessageData & { customerName: string; customerPhone: string; statusLabel: string; priceLabel: string }): string {
  return [
    `Cliente: ${d.customerName}`,
    `WhatsApp: ${d.customerPhone}`,
    `Serviço: ${d.serviceName}`,
    `Data: ${d.dateLabel}`,
    `Horário: ${d.timeLabel}`,
    `Valor: ${d.priceLabel}`,
    `Status: ${d.statusLabel}`,
  ].join("\n");
}
