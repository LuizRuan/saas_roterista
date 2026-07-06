import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Antes do dotenv: garante limiter desligado e defaults de dev/test
    env: { NODE_ENV: "test" },
    // O download do binário do MongoDB em memória pode demorar na 1ª execução
    hookTimeout: 120_000,
    testTimeout: 20_000,
  },
});
