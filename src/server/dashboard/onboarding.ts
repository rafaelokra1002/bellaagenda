import { prisma } from "@/lib/prisma";

export interface OnboardingStep {
  id: "perfil" | "servicos" | "horarios" | "divulgar" | "primeiro";
  title: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
}

/** Checklist de primeiros passos, calculado a partir dos dados reais da profissional. */
export async function getOnboarding(professionalId: string): Promise<OnboardingStep[]> {
  const [p, activeServices, hours, appointments] = await Promise.all([
    prisma.professional.findUniqueOrThrow({ where: { id: professionalId }, select: { description: true, headline: true, photoUrl: true } }),
    prisma.service.count({ where: { professionalId, isActive: true } }),
    prisma.businessHour.count({ where: { professionalId, isActive: true } }),
    prisma.appointment.count({ where: { professionalId, isDemo: false } }),
  ]);
  const hasAppointment = appointments > 0;

  return [
    {
      id: "perfil",
      title: "Complete seu perfil",
      description: "Adicione sua especialidade, uma apresentação e foto. É o que a cliente vê primeiro.",
      href: "/painel/configuracoes",
      cta: "Editar perfil",
      done: !!(p.headline || p.description || p.photoUrl),
    },
    {
      id: "servicos",
      title: "Cadastre seus serviços",
      description: "Informe nome, preço e duração de cada serviço. Só os ativos aparecem para agendamento.",
      href: "/painel/servicos",
      cta: "Cadastrar serviços",
      done: activeServices > 0,
    },
    {
      id: "horarios",
      title: "Configure seus horários",
      description: "Defina os dias e períodos em que você atende. Os horários livres são calculados a partir daqui.",
      href: "/painel/horarios",
      cta: "Definir horários",
      done: hours > 0,
    },
    {
      id: "divulgar",
      title: "Divulgue sua página",
      description: "Copie o link e coloque na bio do Instagram e no status do WhatsApp.",
      href: "/painel/configuracoes",
      cta: "Copiar link",
      done: hasAppointment,
    },
    {
      id: "primeiro",
      title: "Receba o primeiro agendamento",
      description: "Faça um teste você mesma pela sua página para ver como a cliente agenda.",
      href: "",
      cta: "Abrir minha página",
      done: hasAppointment,
    },
  ];
}
