import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-6xl font-semibold text-gold-deep">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 max-w-sm text-sm text-cocoa-muted">O endereço pode estar incorreto ou a página não está mais disponível.</p>
      <Link href="/" className={buttonClasses("primary", "md", "mt-6")}>
        Voltar ao início
      </Link>
    </main>
  );
}
