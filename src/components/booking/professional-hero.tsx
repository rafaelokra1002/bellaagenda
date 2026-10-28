import { AtSign, MapPin, MessageCircle } from "lucide-react";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { buttonClasses } from "@/components/ui/button";

interface Props {
  name: string;
  headline: string | null;
  description: string | null;
  photoUrl: string | null;
  coverUrl: string | null;
  address: string | null;
  instagram: string | null;
  whatsapp: string;
}

export function initials(name: string) {
  return name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function ProfessionalHero(p: Props) {
  return (
    <header className="relative">
      <div className="h-36 overflow-hidden sm:h-52">
        {p.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(120%_120%_at_10%_0%,#f8e8ec_0%,#e8d2c4_55%,#d9bfae_100%)]" />
        )}
      </div>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="-mt-14 flex flex-col items-center text-center sm:-mt-16 sm:flex-row sm:items-end sm:gap-6 sm:text-left">
          {p.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photoUrl} alt={`Foto de ${p.name}`} className="size-28 rounded-full border-4 border-white object-cover shadow-lift sm:size-32" />
          ) : (
            <div className="flex size-28 items-center justify-center rounded-full border-4 border-white bg-blush font-display text-4xl font-semibold text-gold-deep shadow-lift sm:size-32" aria-hidden>
              {initials(p.name)}
            </div>
          )}
          <div className="mt-3 flex-1 sm:mb-2">
            <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{p.name}</h1>
            {p.headline && <p className="mt-1 text-sm uppercase tracking-[0.14em] text-gold-deep">{p.headline}</p>}
          </div>
          <a href={buildWhatsappLink(p.whatsapp)} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "md", "mt-4 sm:mb-2 sm:mt-0")}>
            <MessageCircle className="size-4" /> Falar no WhatsApp
          </a>
        </div>
        {(p.description || p.address || p.instagram) && (
          <div className="mt-5 space-y-2 text-center text-sm text-cocoa-soft sm:text-left">
            {p.description && <p className="mx-auto max-w-2xl leading-relaxed sm:mx-0">{p.description}</p>}
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-cocoa-muted sm:justify-start">
              {p.address && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" /> {p.address}
                </span>
              )}
              {p.instagram && (
                <a href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-cocoa">
                  <AtSign className="size-4" /> {p.instagram}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
