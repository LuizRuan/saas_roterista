import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("redige campos sensíveis do meta antes de logar (senha, token, hash)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { logger } = await import("../lib/logger");

    logger.error("auth", "login falhou", {
      senha: "senha-em-claro-123",
      senhaHash: "$2b$12$hashsecreto",
      refreshTokenHash: "hash-do-refresh",
      turnstileToken: "token-captcha",
      nome: "Ruan",
    });

    const saida = JSON.stringify(spy.mock.calls[0]);
    expect(saida).not.toContain("senha-em-claro-123");
    expect(saida).not.toContain("$2b$12$hashsecreto");
    expect(saida).not.toContain("hash-do-refresh");
    expect(saida).not.toContain("token-captcha");
    expect(saida).toContain("Ruan");
    expect(saida).toContain("[redigido]");
  });

  it("em produção, gera uma linha JSON válida com nivel/modulo/mensagem", async () => {
    // O logger importa config/env, que revalida no import e faz process.exit
    // se faltarem vars obrigatórias em produção — fornecemos as exigidas.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MONGODB_URI", "mongodb://localhost:27017/teste");
    vi.stubEnv("JWT_ACCESS_SECRET", "acesso-secret-teste-producao-com-32-chars");
    vi.stubEnv("JWT_REFRESH_SECRET", "refresh-secret-teste-producao-com-32-chars");
    vi.stubEnv("CLIENT_URL", "https://exemplo.com");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "chave-turnstile-teste");
    vi.resetModules();
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { logger } = await import("../lib/logger");

    logger.info("db", "MongoDB conectado");

    const linha = JSON.parse(spy.mock.calls[0]?.[0] as string);
    expect(linha).toMatchObject({ nivel: "info", modulo: "db", mensagem: "MongoDB conectado" });
    expect(linha.timestamp).toBeTypeOf("string");
  });

  it("fora de produção, gera um formato legível com o módulo entre colchetes", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { logger } = await import("../lib/logger");

    logger.warn("cleanup", "algo demorou");

    const saida = spy.mock.calls[0]?.join(" ") ?? "";
    expect(saida).toContain("[cleanup]");
    expect(saida).toContain("algo demorou");
  });
});
