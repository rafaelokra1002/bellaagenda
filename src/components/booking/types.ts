export interface BookingService {
  id: string;
  name: string;
  description: string | null;
  price: string;
  durationMinutes: number;
  imageUrl: string | null;
}

export interface BookingProfessional {
  slug: string;
  name: string;
  timezone: string;
  maxAdvanceDays: number;
  workingWeekdays: number[];
  whatsapp: string;
}

export interface SlotOption {
  time: string;
  startAt: string;
}
