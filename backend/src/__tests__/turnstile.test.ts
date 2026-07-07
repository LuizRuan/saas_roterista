import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("verificarTurnstile", () => {
  const secretOriginal = process.env.TURNSTILE_SECRET_KEY;

  afterEach(() => {
    process.env.TURNSTILE_SECRET_KEY = secretOriginal;
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("pula a verificação (permite) quando TURNSTILE_SECRET_KEY não está configurada", async () => {
    process.env.TURNSTILE_SECRET_KEY = "";
    vi.resetModules();
    const { verificarTurnstile } = await import("../services/turnstile");

    expect(await verificarTurnstile(undefined, "1.2.3.4")).toBe(true);
  });

  describe("com TURNSTILE_SECRET_KEY configurada", () => {
    beforeEach(() => {
      process.env.TURNSTILE_SECRET_KEY = "chave-secreta-de-teste";
      vi.resetModules();
    });

    it("rejeita quando não veio token nenhum", async () => {
      const { verificarTurnstile } = await import("../services/turnstile");
      expect(await verificarTurnstile(undefined, "1.2.3.4")).toBe(false);
    });

    it("aprova quando a Cloudflare responde success: true", async () => {
      const fetchMock = vi.fn(async () => ({
        json: async () => ({ success: true }),
      }));
      vi.stubGlobal("fetch", fetchMock);

      const { verificarTurnstile } = await import("../services/turnstile");
      const ok = await verificarTurnstile("token-valido", "1.2.3.4");

      expect(ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("reprova quando a Cloudflare responde success: false", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => ({
        json: async () => ({ success: false }),
      })));

      const { verificarTurnstile } = await import("../services/turnstile");
      expect(await verificarTurnstile("token-invalido", "1.2.3.4")).toBe(false);
    });

    it("reprova (sem lançar) quando a chamada à Cloudflare falha", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => {
        throw new Error("rede fora");
      }));

      const { verificarTurnstile } = await import("../services/turnstile");
      expect(await verificarTurnstile("token-qualquer", "1.2.3.4")).toBe(false);
    });
  });
});
