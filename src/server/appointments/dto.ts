import type { Appointment } from "@prisma/client";

export interface AppointmentRow {
  id: string;
  startAt: string;
  endAt: string;
  status: Appointment["status"];
  serviceName: string;
  price: string;
  customerNotes: string | null;
  customer: { id: string; name: string; whatsapp: string };
}

export function toAppointmentRow(a: Appointment & { customer: { id: string; name: string; whatsapp: string } }): AppointmentRow {
  return {
    id: a.id,
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    status: a.status,
    serviceName: a.serviceNameSnapshot,
    price: a.priceSnapshot.toFixed(2),
    customerNotes: a.customerNotes,
    customer: a.customer,
  };
}
