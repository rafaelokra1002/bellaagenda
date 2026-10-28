/**
 * Ponto de extensão para notificações automáticas (lembretes, confirmações).
 *
 * Hoje NÃO há envio automático: o canal ativo é "disabled" e apenas registra
 * que nada foi enviado. A futura implementação "whatsapp-cloud" usará a
 * WhatsApp Business Platform (Cloud API) com:
 *   - WHATSAPP_CLOUD_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID (credenciais reais);
 *   - modelos de mensagem aprovados pela Meta (obrigatórios fora da janela de 24h);
 *   - webhook (WHATSAPP_WEBHOOK_VERIFY_TOKEN) para status de entrega/leitura;
 *   - opt-in registrado da cliente (Customer.consentAt).
 * Só considere uma mensagem "enviada" quando a API confirmar, e "entregue"
 * quando o webhook informar.
 */

export type NotificationKind = "APPOINTMENT_CREATED" | "APPOINTMENT_REMINDER" | "APPOINTMENT_CANCELLED" | "APPOINTMENT_RESCHEDULED";

export interface NotificationRequest {
  kind: NotificationKind;
  professionalId: string;
  appointmentId: string;
  toWhatsapp: string;
}

export type NotificationResult = { status: "not_sent"; reason: string } | { status: "accepted"; providerMessageId: string };

export interface NotificationChannel {
  readonly name: string;
  send(req: NotificationRequest): Promise<NotificationResult>;
}

export const disabledChannel: NotificationChannel = {
  name: "disabled",
  async send() {
    return { status: "not_sent", reason: "Envio automático ainda não configurado." };
  },
};

export function getNotificationChannel(): NotificationChannel {
  return disabledChannel;
}
