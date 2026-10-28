/**
 * Cria a página pública de demonstração (/agendar/studio-demo) — seguro para
 * produção:
 *   - só serviços e horários de exemplo; nenhuma cliente ou agendamento fictício;
 *   - a conta vinculada recebe uma senha aleatória que é descartada (ninguém
 *     consegue entrar no painel com ela);
 *   - não altera nada se a página já existir.
 *
 *   npm run demo:page
 *
 * Agendamentos feitos por visitantes na demo ficam gravados normalmente;
 * remova a página com `npm run demo:page -- --remove` quando não precisar mais.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/server/auth/password";
import { DEMO_HOURS, DEMO_PROFILE, DEMO_SERVICES, DEMO_SLUG } from "../prisma/demo-data";

const DEMO_PAGE_EMAIL = "demo-page@bellaagenda.invalid";

async function main() {
  const { values } = parseArgs({ options: { remove: { type: "boolean", default: false } } });
  const existing = await prisma.professional.findUnique({ where: { slug: DEMO_SLUG } });

  if (values.remove) {
    if (!existing?.isDemo) {
      console.log(existing ? `✖ /agendar/${DEMO_SLUG} não é uma página de demonstração; nada removido.` : "Nenhuma página de demonstração encontrada.");
      return;
    }
    await prisma.$transaction([
      prisma.appointment.deleteMany({ where: { professionalId: existing.id } }),
      prisma.user.delete({ where: { id: existing.userId } }),
    ]);
    console.log("✔ Página de demonstração removida.");
    return;
  }

  if (existing) {
    console.log(`Já existe uma página em /agendar/${DEMO_SLUG}; nada foi alterado.`);
    return;
  }

  await prisma.user.create({
    data: {
      name: "Página de demonstração",
      email: DEMO_PAGE_EMAIL,
      // Senha aleatória nunca exibida: a conta não serve para login.
      passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
      professional: {
        create: {
          ...DEMO_PROFILE,
          services: { create: DEMO_SERVICES.map((s, i) => ({ ...s, sortOrder: i })) },
          businessHours: { create: DEMO_HOURS },
        },
      },
    },
  });
  console.log(`✔ Página de demonstração criada: /agendar/${DEMO_SLUG}`);
}

main()
  .catch((e: unknown) => {
    console.error(`✖ ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
