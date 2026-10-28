import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicProfile } from "@/server/professional/service";
import { BookingFlow } from "@/components/booking/booking-flow";
import { ProfessionalHero } from "@/components/booking/professional-hero";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublicProfile(slug);
  if (!p) return { title: "Página não encontrada" };
  return {
    title: `Agendar com ${p.name}`,
    description: p.headline ?? `Agende seu horário online com ${p.name}.`,
    openGraph: { title: `Agendar com ${p.name}`, images: p.photoUrl ? [p.photoUrl] : undefined },
  };
}

export default async function PublicBookingPage({ params }: Props) {
  const { slug } = await params;
  const p = await getPublicProfile(slug);
  if (!p) notFound();

  return (
    <main className="pb-16" style={p.accentColor ? ({ "--accent": p.accentColor } as React.CSSProperties) : undefined}>
      <ProfessionalHero {...p} />
      <div className="mx-auto mt-10 max-w-5xl px-4 sm:px-6">
        <BookingFlow
          professional={{ slug: p.slug, name: p.name, timezone: p.timezone, maxAdvanceDays: p.maxAdvanceDays, workingWeekdays: p.workingWeekdays, whatsapp: p.whatsapp }}
          services={p.services}
        />
      </div>
      <footer className="mx-auto mt-16 max-w-5xl px-4 text-center text-xs text-cocoa-muted sm:px-6">
        Seus dados são usados apenas por {p.name} para gerenciar o atendimento (LGPD). Agendamento por BellaAgenda.
      </footer>
    </main>
  );
}
