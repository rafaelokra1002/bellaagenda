import { config as loadEnv } from "dotenv";
import path from "node:path";
import { defineConfig } from "vitest/config";

loadEnv();

// Testes de integração NUNCA usam o banco de desenvolvimento.
const testDb = process.env.TEST_DATABASE_URL;
if (testDb) process.env.DATABASE_URL = testDb;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // Os testes de integração compartilham um banco; rodam em sequência.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: { TZ: "UTC", RATE_LIMIT_DISABLED: "false" },
  },
});
