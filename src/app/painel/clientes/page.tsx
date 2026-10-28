import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { requireAuth } from "@/server/auth/guard";
import { listCustomers } from "@/server/customers/service";
import { formatWhatsapp } from "@/lib/phone";
import { formatDateBR } from "@/lib/time";
import { SearchBox } from "@/components/panel/search-box";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function CustomersPage({ searchParams }: Props) {
  const auth = await requireAuth();
  const raw = await searchParams;
  const q = raw.q?.trim().slice(0, 80) || undefined;
  const page = Math.max(1, Math.min(10_000, Number(raw.page) || 1));
  const { items, total, pageCount } = await listCustomers(auth.professionalId, q, page);
  const tz = auth.timezone;

  return (
    <>
      <PageHeader title="Clientes" description={`${total} ${total === 1 ? "cliente" : "clientes"} cadastradas pelos agendamentos.`} />
      <SearchBox placeholder="Buscar por nome ou telefone" />
      {items.length === 0 ? (
        <EmptyState icon={<Users className="size-8" />} title={q ? "Nenhuma cliente encontrada" : "Nenhuma cliente ainda"}>
          {q ? "Tente outro nome ou número." : "As clientes são cadastradas automaticamente ao agendar pela sua página."}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead className="hidden bg-cream text-left text-xs uppercase tracking-wider text-cocoa-muted md:table-header-group">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">WhatsApp</th>
                <th className="px-4 py-3 font-medium">Primeiro agendamento</th>
                <th className="px-4 py-3 font-medium">Último atendimento</th>
                <th className="px-4 py-3 text-right font-medium">Atendimentos</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((c) => (
                <tr key={c.id} className="relative block hover:bg-cream md:table-row">
                  <td className="block px-4 pt-3 font-medium md:table-cell md:py-3">
                    <Link href={`/painel/clientes/${c.id}`} className="after:absolute after:inset-0">
                      {c.name}
                    </Link>
                  </td>
                  <td className="block px-4 text-cocoa-muted md:table-cell md:py-3">{formatWhatsapp(c.whatsapp)}</td>
                  <td className="hidden px-4 py-3 md:table-cell">{c.firstAppointmentAt ? formatDateBR(c.firstAppointmentAt, tz) : "—"}</td>
                  <td className="block px-4 pb-3 text-xs text-cocoa-muted md:table-cell md:py-3 md:text-sm md:text-cocoa">
                    <span className="md:hidden">Último atendimento: </span>
                    {c.lastCompletedAt ? formatDateBR(c.lastCompletedAt, tz) : "—"}
                    <span className="md:hidden"> · {c.completedCount} concluídos</span>
                  </td>
                  <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">
                    {c.completedCount} <span className="text-cocoa-muted">/ {c.totalAppointments}</span>
                  </td>
                  <td className="absolute right-3 top-1/2 -translate-y-1/2 md:static md:translate-y-0 md:pr-3">
                    <ChevronRight className="size-4 text-cocoa-muted" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageCount={pageCount} basePath="/painel/clientes" params={raw} />
    </>
  );
}
