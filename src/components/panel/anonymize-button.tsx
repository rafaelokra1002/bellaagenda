"use client";

import { ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/dialog";

/** Atende pedido de exclusão (LGPD): anonimiza nome/WhatsApp e mantém o histórico sem identificação. */
export function AnonymizeButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [loading, setLoading] = useState(false);

  const run = async () => {
    const ok = await confirm({
      title: "Remover dados pessoais?",
      description:
        "Use quando a cliente pedir a exclusão dos dados (LGPD). Nome, WhatsApp e observações serão apagados de forma definitiva; os atendimentos continuam no histórico financeiro sem identificação.",
      confirmLabel: "Remover dados",
      danger: true,
    });
    if (!ok) return;
    setLoading(true);
    try {
      await apiFetch(`/api/admin/customers/${customerId}/anonymize`, { method: "POST" });
      toast.success("Dados pessoais removidos.");
      router.push("/painel/clientes");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={run} loading={loading}>
        <ShieldX className="size-4" /> Remover dados
      </Button>
      {dialog}
    </>
  );
}
