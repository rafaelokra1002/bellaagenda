"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { STATUS_LABEL } from "@/lib/status";
import { APPOINTMENT_STATUSES } from "@/validation/admin";
import { Input, Select } from "@/components/ui/form";

export function AppointmentFilters({ services }: { services: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  // Busca com debounce
  useEffect(() => {
    if ((params.get("q") ?? "") === q) return;
    const t = setTimeout(() => update({ q: q.trim() || null }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = ["q", "date", "serviceId", "status"].some((k) => params.get(k));

  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_170px_200px_170px_auto]" aria-busy={pending}>
      <label className="relative">
        <span className="sr-only">Buscar por nome ou telefone</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cocoa-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou telefone" className="pl-9" />
      </label>
      <label>
        <span className="sr-only">Data</span>
        <Input type="date" value={params.get("date") ?? ""} onChange={(e) => update({ date: e.target.value || null })} />
      </label>
      <label>
        <span className="sr-only">Serviço</span>
        <Select value={params.get("serviceId") ?? ""} onChange={(e) => update({ serviceId: e.target.value || null })}>
          <option value="">Todos os serviços</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </label>
      <label>
        <span className="sr-only">Status</span>
        <Select value={params.get("status") ?? ""} onChange={(e) => update({ status: e.target.value || null })}>
          <option value="">Todos os status</option>
          {APPOINTMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </label>
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
          className="inline-flex h-11 items-center justify-center gap-1 rounded-xl px-3 text-sm text-cocoa-muted hover:bg-nude-soft"
        >
          <X className="size-4" /> Limpar
        </button>
      )}
    </div>
  );
}
