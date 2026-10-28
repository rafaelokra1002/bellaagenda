/** Dados de exemplo compartilhados pelo seed (dev) e pela página de demonstração (produção). */

export const DEMO_SLUG = "studio-demo";
export const DEMO_TZ = "America/Bahia";

export const DEMO_PROFILE = {
  name: "Bella Studio (Demonstração)",
  slug: DEMO_SLUG,
  headline: "Extensão de cílios e design de sobrancelhas",
  description:
    "Página de demonstração do BellaAgenda. Serviços, valores e horários são exemplos fictícios e podem ser editados no painel.",
  whatsapp: "5571900000000",
  address: "Endereço de demonstração — Salvador, BA",
  timezone: DEMO_TZ,
  slotStepMinutes: 30,
  defaultBufferMinutes: 0,
  minNoticeMinutes: 120,
  maxAdvanceDays: 60,
  isDemo: true,
};

export const DEMO_SERVICES = [
  { name: "Extensão de cílios", description: "Aplicação fio a fio para um olhar marcante e natural. (Valor de exemplo)", price: "120.00", durationMinutes: 120, bufferMinutes: 15 },
  { name: "Manutenção de cílios", description: "Reposição dos fios para manter o volume da extensão. (Valor de exemplo)", price: "70.00", durationMinutes: 60, bufferMinutes: 15 },
  { name: "Design de sobrancelhas", description: "Modelagem personalizada respeitando o formato do rosto. (Valor de exemplo)", price: "35.00", durationMinutes: 30, bufferMinutes: null },
  { name: "Design com henna", description: "Design com aplicação de henna para preencher e definir. (Valor de exemplo)", price: "50.00", durationMinutes: 45, bufferMinutes: null },
  { name: "Lash lifting", description: "Curvatura e nutrição dos cílios naturais. (Valor de exemplo)", price: "90.00", durationMinutes: 60, bufferMinutes: 15 },
];

// Seg–Sex: 08–12 e 14–18 · Sáb: 08–13
export const DEMO_HOURS = [
  ...[1, 2, 3, 4, 5].flatMap((d) => [
    { dayOfWeek: d, startTime: "08:00", endTime: "12:00" },
    { dayOfWeek: d, startTime: "14:00", endTime: "18:00" },
  ]),
  { dayOfWeek: 6, startTime: "08:00", endTime: "13:00" },
];
