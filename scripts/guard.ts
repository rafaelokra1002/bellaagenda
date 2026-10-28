/** Impede que scripts de desenvolvimento rodem contra produção por engano. */
export function assertNotProduction(scriptName: string): void {
  const url = process.env.DATABASE_URL ?? "";
  const isLocal = /@(localhost|127\.0\.0\.1|db|postgres)(:\d+)?\//.test(url);
  if (process.env.NODE_ENV === "production") {
    console.error(`✖ ${scriptName} não pode ser executado com NODE_ENV=production.`);
    process.exit(1);
  }
  if (!isLocal && process.env.ALLOW_DEMO_SEED !== "true") {
    console.error(`✖ ${scriptName}: DATABASE_URL não aponta para um banco local.`);
    console.error("  Se este for realmente um banco de testes/homologação, rode com ALLOW_DEMO_SEED=true.");
    process.exit(1);
  }
}
