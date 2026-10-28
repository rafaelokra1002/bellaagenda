"use client";

import Link from "next/link";
import { Check, Copy, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { OnboardingStep } from "@/server/dashboard/onboarding";
import { buttonClasses } from "@/components/ui/button";

export function OnboardingChecklist({ steps, slug }: { steps: OnboardingStep[]; slug: string }) {
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  const pagePath = `/agendar/${slug}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${pagePath}`);
      toast.success("Link copiado! Cole na bio do Instagram ou envie pelo WhatsApp.");
    } catch {
      toast.error("Não foi possível copiar. O link é: " + pagePath);
    }
  };

  return (
    <section aria-labelledby="h-primeiros-passos" className="mb-8 rounded-2xl border border-gold/40 bg-gradient-to-br from-blush/70 to-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="h-primeiros-passos" className="flex items-center gap-2 font-display text-2xl font-semibold">
          <Sparkles className="size-5 text-gold-deep" /> Primeiros passos
        </h2>
        <span className="text-sm text-cocoa-muted">
          {done} de {steps.length} concluídos
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done}>
        <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>

      <ol className="mt-4 space-y-2">
        {steps.map((s, i) => {
          const isNext = s.id === next?.id;
          return (
            <li key={s.id} className={cn("flex items-start gap-3 rounded-xl p-3", isNext ? "bg-white shadow-soft" : "")}>
              <span
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  s.done ? "bg-emerald-600 text-white" : isNext ? "bg-cocoa text-white" : "bg-white text-cocoa-muted ring-1 ring-line",
                )}
                aria-hidden
              >
                {s.done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", s.done && "text-cocoa-muted line-through")}>{s.title}</p>
                {!s.done && <p className="mt-0.5 text-sm text-cocoa-muted">{s.description}</p>}
                {isNext && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {s.id === "divulgar" ? (
                      <button type="button" onClick={copyLink} className={buttonClasses("primary", "sm")}>
                        <Copy className="size-4" /> Copiar link da minha página
                      </button>
                    ) : s.id === "primeiro" ? (
                      <a href={pagePath} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary", "sm")}>
                        <ExternalLink className="size-4" /> {s.cta}
                      </a>
                    ) : (
                      <Link href={s.href} className={buttonClasses("primary", "sm")}>
                        {s.cta}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-cocoa-muted">
        Dúvidas? Veja a{" "}
        <Link href="/painel/ajuda" className="font-medium text-gold-deep underline-offset-2 hover:underline">
          página de Ajuda
        </Link>
        . Este quadro some quando tudo estiver pronto.
      </p>
    </section>
  );
}
