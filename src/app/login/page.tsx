import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/server/auth/guard";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function LoginPage() {
  if (await getCurrentAuth()) redirect("/painel");
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(100%_70%_at_50%_0%,#f8e8ec_0%,#fdf9f7_75%)] px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <Link href="/" className="block text-center font-display text-3xl font-semibold">
          Bella<span className="text-gold-deep">Agenda</span>
        </Link>
        <div className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-lift">
          <h1 className="font-display text-2xl font-semibold">Entrar no painel</h1>
          <p className="mb-5 mt-1 text-sm text-cocoa-muted">Área exclusiva da profissional.</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
