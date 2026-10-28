import Link from "next/link";
import { CalendarHeart, Clock3, MessageCircle, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buttonClasses } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const DEMO_SLUG = "studio-demo";

const FEATURES = [
  { icon: CalendarHeart, title: "Página própria de agendamento", text: "Suas clientes escolhem serviço, data e horário pelo celular, sem criar conta." },
  { icon: Clock3, title: "Horários sempre corretos", text: "Expediente, pausas, folgas e duração de cada serviço calculados automaticamente." },
  { icon: MessageCircle, title: "Feito para o WhatsApp", text: "Confirmação e contato com a cliente em um toque, com mensagem pronta." },
  { icon: ShieldCheck, title: "Seguro e alinhado à LGPD", text: "Dados de cada profissional isolados e coleta mínima de informações." },
];

export default async function Home() {
  // Só oferece a demonstração se a página existir (não há seed em produção).
  const hasDemo = !!(await prisma.professional.findFirst({ where: { slug: DEMO_SLUG, isActive: true }, select: { id: true } }).catch(() => null));
  return (
    <main className="min-h-dvh bg-[radial-gradient(90%_60%_at_50%_0%,#f8e8ec_0%,#fdf9f7_70%)]">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <span className="font-display text-2xl font-semibold">
          Bella<span className="text-gold-deep">Agenda</span>
        </span>
        <Link href="/login" className={buttonClasses("outline", "sm")}>
          Entrar
        </Link>
      </nav>
      <section className="mx-auto max-w-3xl px-4 pb-12 pt-10 text-center sm:px-6 sm:pt-16">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-deep">Agenda online para profissionais da beleza</p>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] sm:text-6xl">Sua agenda organizada, suas clientes agendando sozinhas.</h1>
        <p className="mx-auto mt-5 max-w-xl text-cocoa-soft">
          Extensão de cílios, design de sobrancelhas e muito mais: publique seus serviços, defina seus horários e receba agendamentos sem conflitos.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {hasDemo && (
            <Link href={`/agendar/${DEMO_SLUG}`} className={buttonClasses("primary", "lg")}>
              Ver página de demonstração
            </Link>
          )}
          <Link href="/login" className={buttonClasses(hasDemo ? "outline" : "primary", "lg")}>
            Acessar o painel
          </Link>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-20 sm:grid-cols-2 sm:px-6">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-line bg-white/80 p-5 shadow-soft">
            <f.icon className="size-6 text-gold-deep" />
            <p className="mt-3 font-display text-xl font-semibold">{f.title}</p>
            <p className="mt-1 text-sm text-cocoa-muted">{f.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
