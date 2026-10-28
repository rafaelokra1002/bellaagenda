import type { Metadata } from "next";
import { requireAuth } from "@/server/auth/guard";
import { PanelNav } from "@/components/panel/nav";

export const metadata: Metadata = { title: "Painel", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuth();
  return (
    <div className="min-h-dvh">
      <PanelNav professionalName={auth.professionalName} slug={auth.professionalSlug} />
      <main className="pb-safe px-4 pt-6 sm:px-6 lg:ml-64 lg:px-10 lg:pb-12 lg:pt-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
