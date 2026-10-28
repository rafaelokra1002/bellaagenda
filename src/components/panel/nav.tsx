"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, CircleHelp, Clock, ExternalLink, LayoutDashboard, ListChecks, LogOut, Menu, Scissors, Settings, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { Dialog } from "@/components/ui/dialog";

const ITEMS = [
  { href: "/painel", label: "Início", icon: LayoutDashboard, exact: true },
  { href: "/painel/agendamentos", label: "Agendamentos", icon: ListChecks },
  { href: "/painel/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/painel/servicos", label: "Serviços", icon: Scissors },
  { href: "/painel/clientes", label: "Clientes", icon: Users },
  { href: "/painel/horarios", label: "Horários", icon: Clock },
  { href: "/painel/configuracoes", label: "Configurações", icon: Settings },
  { href: "/painel/ajuda", label: "Ajuda", icon: CircleHelp },
];
// No celular, as 4 principais ficam fixas; as demais vão para "Mais".
const MOBILE_MAIN = ITEMS.slice(0, 4);
const MOBILE_MORE = ITEMS.slice(4);

function isActive(pathname: string, item: (typeof ITEMS)[number]) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function PanelNav({ professionalName, slug }: { professionalName: string; slug: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const logout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  };

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-white/80 px-4 py-6 backdrop-blur lg:flex">
        <Link href="/painel" className="px-3 font-display text-2xl font-semibold">
          Bella<span className="text-gold-deep">Agenda</span>
        </Link>
        <p className="mt-1 truncate px-3 text-xs text-cocoa-muted">{professionalName}</p>
        <nav className="mt-8 flex-1 space-y-1">
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                isActive(pathname, item) ? "bg-blush font-semibold text-cocoa" : "text-cocoa-soft hover:bg-nude-soft",
              )}
            >
              <item.icon className="size-4.5" /> {item.label}
            </Link>
          ))}
        </nav>
        <a href={`/agendar/${slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-cocoa-soft hover:bg-nude-soft">
          <ExternalLink className="size-4.5" /> Ver minha página
        </a>
        <button type="button" onClick={logout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-cocoa-soft hover:bg-nude-soft">
          <LogOut className="size-4.5" /> Sair
        </button>
      </aside>

      {/* Celular: barra superior + navegação inferior */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-cream/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/painel" className="font-display text-xl font-semibold">
          Bella<span className="text-gold-deep">Agenda</span>
        </Link>
        <a href={`/agendar/${slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-cocoa-muted">
          Minha página <ExternalLink className="size-3.5" />
        </a>
      </header>
      <nav className="bottom-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white/95 backdrop-blur lg:hidden" aria-label="Navegação do painel">
        {MOBILE_MAIN.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn("flex flex-col items-center gap-0.5 py-2.5 text-[11px]", isActive(pathname, item) ? "font-semibold text-cocoa" : "text-cocoa-muted")}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn("flex flex-col items-center gap-0.5 py-2.5 text-[11px]", MOBILE_MORE.some((i) => isActive(pathname, i)) ? "font-semibold text-cocoa" : "text-cocoa-muted")}
        >
          <Menu className="size-5" /> Mais
        </button>
      </nav>
      <Dialog open={moreOpen} onOpenChange={setMoreOpen} title="Menu" size="sm">
        <div className="space-y-1 pb-2">
          {MOBILE_MORE.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-nude-soft">
              <item.icon className="size-5 text-gold-deep" /> {item.label}
            </Link>
          ))}
          <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-nude-soft">
            <LogOut className="size-5 text-gold-deep" /> Sair
          </button>
        </div>
      </Dialog>
    </>
  );
}
