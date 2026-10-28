import { requireAuth } from "@/server/auth/guard";
import { listServices } from "@/server/catalog/service";
import { prisma } from "@/lib/prisma";
import { ServicesManager } from "@/components/panel/services-manager";
import { PageHeader } from "@/components/ui/misc";

export default async function ServicesPage() {
  const auth = await requireAuth();
  const [services, professional] = await Promise.all([
    listServices(auth.professionalId),
    prisma.professional.findUniqueOrThrow({ where: { id: auth.professionalId }, select: { defaultBufferMinutes: true } }),
  ]);
  return (
    <>
      <PageHeader title="Serviços" description="Valores, duração e o que aparece na sua página pública." />
      <ServicesManager initial={services} defaultBuffer={professional.defaultBufferMinutes} />
    </>
  );
}
