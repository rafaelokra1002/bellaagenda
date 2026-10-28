/**
 * Cria a conta administrativa de uma profissional (ou redefine a senha se o
 * e-mail já existir). Seguro para produção: nenhuma credencial fica no código.
 *
 *   npm run admin:create -- --email maria@exemplo.com --name "Maria Silva" \
 *     --slug maria-silva --whatsapp "(71) 99999-8888"
 *
 * A senha é lida da variável ADMIN_PASSWORD ou digitada no terminal.
 */
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { normalizeWhatsapp } from "../src/lib/phone";
import { DEFAULT_TIMEZONE, isValidTimeZone } from "../src/lib/time";
import { upsertAdminAccount } from "../src/server/professional/service";
import { prisma } from "../src/lib/prisma";

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      slug: { type: "string" },
      whatsapp: { type: "string" },
      timezone: { type: "string", default: process.env.DEFAULT_TIMEZONE || DEFAULT_TIMEZONE },
    },
  });

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (label: string, current?: string) => (current?.trim() ? current.trim() : (await rl.question(`${label}: `)).trim());

  const email = (await ask("E-mail", values.email)).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
  const name = await ask("Nome profissional", values.name);
  if (name.length < 2) throw new Error("Nome inválido.");
  const slug = (await ask("Endereço da página (slug, ex.: maria-silva)", values.slug)).toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error("Slug inválido: use letras minúsculas, números e hífens.");
  const whatsapp = normalizeWhatsapp(await ask("WhatsApp com DDD", values.whatsapp));
  if (!whatsapp) throw new Error("WhatsApp inválido.");
  const timezone = values.timezone ?? DEFAULT_TIMEZONE;
  if (!isValidTimeZone(timezone)) throw new Error("Fuso horário inválido.");

  let password = process.env.ADMIN_PASSWORD ?? "";
  if (!password) {
    console.log("(A senha ficará visível enquanto digita. Para evitar, defina ADMIN_PASSWORD.)");
    password = await rl.question("Senha (mín. 10 caracteres): ");
  }
  rl.close();
  if (password.length < 10) throw new Error("A senha precisa ter pelo menos 10 caracteres.");

  const { created } = await upsertAdminAccount({ name, email, password, slug, whatsapp, timezone });
  console.log(created ? `\n✔ Conta criada. Página pública: /agendar/${slug}` : "\n✔ E-mail já existia: senha redefinida e sessões encerradas.");
}

main()
  .catch((e: unknown) => {
    console.error(`✖ ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
