import Link from "next/link";
import { CalendarDays, ChevronDown, Clock, ListChecks, MessageCircle, Rocket, Scissors, ShieldCheck, Users } from "lucide-react";
import { requireAuth } from "@/server/auth/guard";
import { PageHeader } from "@/components/ui/misc";

interface Topic {
  icon: typeof Rocket;
  title: string;
  href?: string;
  items: Array<{ q: string; a: React.ReactNode }>;
}

function topics(slug: string): Topic[] {
  return [
    {
      icon: Rocket,
      title: "Como o BellaAgenda funciona",
      items: [
        {
          q: "Visão geral",
          a: (
            <>
              Você tem uma página própria de agendamento em <b>/agendar/{slug}</b>. A cliente escolhe o serviço, a data e um horário livre, informa nome e
              WhatsApp e confirma, sem criar conta. O agendamento aparece na hora aqui no painel como <b>Pendente</b>.
            </>
          ),
        },
        {
          q: "Por onde começar?",
          a: (
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Em <b>Configurações</b>, complete o perfil: especialidade, apresentação, foto e WhatsApp.
              </li>
              <li>
                Em <b>Serviços</b>, cadastre os serviços com preço e duração.
              </li>
              <li>
                Em <b>Horários</b>, defina os dias e períodos em que você atende.
              </li>
              <li>Copie o link da sua página e divulgue (bio do Instagram, status do WhatsApp).</li>
              <li>Faça um agendamento de teste você mesma para ver o que a cliente vê.</li>
            </ol>
          ),
        },
      ],
    },
    {
      icon: Scissors,
      title: "Serviços",
      href: "/painel/servicos",
      items: [
        { q: "Preço e duração", a: "A duração define quanto tempo da agenda o atendimento ocupa. Use a duração real do procedimento." },
        {
          q: "O que é o “intervalo após o atendimento”?",
          a: "É um tempo extra reservado depois do serviço para limpeza ou preparação. Ex.: extensão de 120 min + 15 min de intervalo ocupa 2h15 da agenda. Se deixar “usar padrão”, vale o intervalo definido em Horários → Regras da agenda.",
        },
        {
          q: "Desativar ou excluir?",
          a: "Desativar esconde o serviço da página pública e mantém o histórico. Só é possível excluir um serviço que nunca teve agendamentos.",
        },
        { q: "Mudar o preço afeta agendamentos já feitos?", a: "Não. Cada agendamento guarda o nome, o preço e a duração do momento em que foi marcado." },
      ],
    },
    {
      icon: Clock,
      title: "Horários, folgas e férias",
      href: "/painel/horarios",
      items: [
        {
          q: "Como configurar o horário de almoço?",
          a: "Crie dois períodos no mesmo dia, por exemplo 08:00–12:00 e 14:00–18:00. O intervalo entre eles fica sem horários. Use “Copiar para seg–sex” para repetir nos dias úteis.",
        },
        {
          q: "O que é o “intervalo entre opções de horário”?",
          a: "É de quanto em quanto tempo os horários aparecem para a cliente. Com 30 minutos: 08:00, 08:30, 09:00…",
        },
        {
          q: "Antecedência mínima e dias futuros",
          a: "A antecedência mínima impede agendamentos em cima da hora (ex.: 2 horas). O limite de dias define até quando a cliente pode agendar (ex.: próximos 60 dias).",
        },
        {
          q: "Vou tirar folga ou férias. E agora?",
          a: "Em Horários → Bloqueios, escolha as datas (ou um horário específico) e clique em “Bloquear período”. Esses horários somem da página. Se já houver clientes marcadas no período, o sistema avisa. Elas não são canceladas automaticamente, então remarque ou cancele cada uma em Agendamentos.",
        },
        {
          q: "Mudei meu expediente e alguém já estava marcado fora dele",
          a: "Os agendamentos existentes são mantidos. Ao salvar, o sistema lista quais ficaram fora do novo horário para você decidir o que fazer.",
        },
      ],
    },
    {
      icon: ListChecks,
      title: "Agendamentos e status",
      href: "/painel/agendamentos",
      items: [
        {
          q: "O que significa cada status?",
          a: (
            <ul className="space-y-1">
              <li>
                <b>Pendente</b>: a cliente acabou de agendar. O horário já está reservado.
              </li>
              <li>
                <b>Confirmado</b>: você confirmou com a cliente.
              </li>
              <li>
                <b>Concluído</b>: o atendimento aconteceu. Só os concluídos entram no faturamento.
              </li>
              <li>
                <b>Não compareceu</b>: a cliente faltou.
              </li>
              <li>
                <b>Cancelado</b>: o horário é liberado na hora para outras clientes.
              </li>
            </ul>
          ),
        },
        {
          q: "Como mudar o status, remarcar ou cancelar?",
          a: "Toque no agendamento (no Início, em Agendamentos ou no Calendário) para abrir os detalhes. Ali estão os botões Confirmar, Concluir, Não compareceu, Cancelar e Remarcar. “Concluído” e “Não compareceu” só aparecem depois do horário do atendimento.",
        },
        {
          q: "Como remarcar?",
          a: "Em Remarcar, escolha a nova data. O sistema mostra só os horários realmente livres. O histórico de alterações registra a data antiga e a nova.",
        },
        { q: "Dá para desfazer um cancelamento?", a: "Não. O horário foi liberado e pode ter sido ocupado. Se a cliente quiser voltar, faça um novo agendamento." },
        {
          q: "Duas clientes podem pegar o mesmo horário?",
          a: "Não. Mesmo que duas pessoas tentem ao mesmo tempo, só uma consegue. A outra recebe um aviso para escolher outro horário.",
        },
      ],
    },
    {
      icon: CalendarDays,
      title: "Calendário",
      href: "/painel/calendario",
      items: [
        {
          q: "Visões de dia, semana e mês",
          a: "Use os botões Dia, Semana e Mês e as setas para navegar. Na visão Dia aparecem os atendimentos, os bloqueios e os horários livres. As cores indicam o status (veja a legenda abaixo do calendário).",
        },
      ],
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      items: [
        {
          q: "Como a cliente me avisa?",
          a: "Depois de agendar, a cliente vê o botão “Confirmar pelo WhatsApp”, que abre uma conversa com você já com o serviço, a data e o horário escritos. A mensagem só chega se ela tocar em enviar.",
        },
        {
          q: "Como falo com a cliente?",
          a: "Nos detalhes do agendamento, o botão WhatsApp abre a conversa com uma mensagem pronta. “Copiar” e “Compartilhar” levam os dados do atendimento para onde você quiser.",
        },
        {
          q: "O sistema envia lembretes automáticos?",
          a: "Ainda não. Por enquanto as mensagens são enviadas por você, pelo seu WhatsApp. O número que aparece na sua página é o que está em Configurações.",
        },
      ],
    },
    {
      icon: Users,
      title: "Clientes",
      href: "/painel/clientes",
      items: [
        {
          q: "Preciso cadastrar as clientes?",
          a: "Não. Elas são cadastradas automaticamente no primeiro agendamento. O mesmo WhatsApp escrito de formas diferentes é reconhecido como a mesma cliente.",
        },
        { q: "O que aparece na ficha?", a: "Primeiro agendamento, último atendimento, quantidade de atendimentos, total gasto e o histórico completo." },
      ],
    },
    {
      icon: ShieldCheck,
      title: "Privacidade, LGPD e acesso",
      items: [
        {
          q: "A cliente pediu para apagar os dados dela",
          a: "Na ficha da cliente, use “Remover dados”. Nome, WhatsApp e observações são apagados. Os atendimentos continuam no faturamento, sem identificar a pessoa. Cancele ou conclua os atendimentos futuros dela antes.",
        },
        {
          q: "Como troco minha senha?",
          a: "Em Configurações → Acesso. Ao trocar, as outras sessões abertas (em outros aparelhos) são encerradas.",
        },
        {
          q: "Posso pausar minha página?",
          a: "Sim. Em Configurações, desmarque “Página pública ativa”. A página sai do ar e nenhum novo agendamento entra.",
        },
      ],
    },
  ];
}

export default async function HelpPage() {
  const auth = await requireAuth();
  const list = topics(auth.professionalSlug);

  return (
    <>
      <PageHeader title="Ajuda" description="Guia rápido de como usar o BellaAgenda. Toque em uma pergunta para ver a resposta." />
      <nav aria-label="Tópicos" className="mb-6 flex flex-wrap gap-2">
        {list.map((t) => (
          <a key={t.title} href={`#${slugify(t.title)}`} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-cocoa-soft hover:bg-nude-soft">
            {t.title}
          </a>
        ))}
      </nav>
      <div className="space-y-6">
        {list.map((t) => (
          <section key={t.title} id={slugify(t.title)} className="scroll-mt-20 rounded-2xl border border-line bg-white p-5 shadow-soft">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
                <t.icon className="size-5 text-gold-deep" /> {t.title}
              </h2>
              {t.href && (
                <Link href={t.href} className="shrink-0 text-sm font-medium text-gold-deep hover:underline">
                  Abrir →
                </Link>
              )}
            </div>
            <div className="divide-y divide-line">
              {t.items.map((it) => (
                <details key={it.q} className="group py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
                    {it.q}
                    <ChevronDown className="size-4 shrink-0 text-cocoa-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 text-sm leading-relaxed text-cocoa-soft">{it.a}</div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
