import { execSync } from "node:child_process";

/**
 * Aplica as migrations pendentes (incluindo a restrição EXCLUDE) no banco de
 * testes. Não é destrutivo: cada teste limpa as tabelas com resetDb().
 * Só roda quando há testes de integração selecionados.
 */
export default function setup() {
  const onlyUnit = process.argv.some((a) => a.includes("tests/unit") || a.includes("tests\\unit"));
  if (onlyUnit) return;

  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Defina TEST_DATABASE_URL no .env para rodar os testes de integração.");
  if (!/test/i.test(new URL(url).pathname)) throw new Error("TEST_DATABASE_URL deve apontar para um banco cujo nome contenha 'test'.");

  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: url } });
}
