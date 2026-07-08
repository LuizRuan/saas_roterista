import { describe, expect, it, vi, beforeEach } from "vitest";

// `env` é um objeto congelado no import — mockamos o módulo pra poder trocar
// as chaves configuradas entre os testes (provedor.ts lê env.GROQ_API_KEY /
// env.GEMINI_API_KEY a cada chamada, não só na inicialização).
const envMock = { GROQ_API_KEY: "", GEMINI_API_KEY: "" };
vi.mock("../config/env", () => ({ env: envMock }));

vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const groqCreateMock = vi.fn();
vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: groqCreateMock } };
  },
}));

const geminiGenerateMock = vi.fn();
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: geminiGenerateMock };
    }
  },
}));

const { gerarComIA } = await import("../services/ia/provedor");

function respostaGroq(texto: string) {
  return { choices: [{ message: { content: texto } }] };
}
function respostaGemini(texto: string) {
  return { response: { text: () => texto } };
}

beforeEach(() => {
  envMock.GROQ_API_KEY = "";
  envMock.GEMINI_API_KEY = "";
  groqCreateMock.mockReset();
  geminiGenerateMock.mockReset();
});

describe("gerarComIA", () => {
  it("sem nenhuma chave configurada, lança erro antes de tentar rede", async () => {
    await expect(gerarComIA({ sistema: "s", usuario: "u" })).rejects.toThrow(
      "Nenhuma chave de IA configurada"
    );
    expect(groqCreateMock).not.toHaveBeenCalled();
    expect(geminiGenerateMock).not.toHaveBeenCalled();
  });

  it("sem preferir (default), tenta Groq primeiro", async () => {
    envMock.GROQ_API_KEY = "chave-groq";
    envMock.GEMINI_API_KEY = "chave-gemini";
    groqCreateMock.mockResolvedValue(respostaGroq("resposta do groq"));

    const texto = await gerarComIA({ sistema: "s", usuario: "u" });

    expect(texto).toBe("resposta do groq");
    expect(groqCreateMock).toHaveBeenCalledTimes(1);
    expect(geminiGenerateMock).not.toHaveBeenCalled();
  });

  it("preferir: 'gemini' tenta Gemini primeiro", async () => {
    envMock.GROQ_API_KEY = "chave-groq";
    envMock.GEMINI_API_KEY = "chave-gemini";
    geminiGenerateMock.mockResolvedValue(respostaGemini("resposta do gemini"));

    const texto = await gerarComIA({ sistema: "s", usuario: "u", preferir: "gemini" });

    expect(texto).toBe("resposta do gemini");
    expect(geminiGenerateMock).toHaveBeenCalledTimes(1);
    expect(groqCreateMock).not.toHaveBeenCalled();
  });

  it("preferir: 'gemini' cai pro Groq se o Gemini falhar (fallback continua funcionando)", async () => {
    envMock.GROQ_API_KEY = "chave-groq";
    envMock.GEMINI_API_KEY = "chave-gemini";
    geminiGenerateMock.mockRejectedValue(new Error("Gemini fora do ar"));
    groqCreateMock.mockResolvedValue(respostaGroq("resposta do groq (fallback)"));

    const texto = await gerarComIA({ sistema: "s", usuario: "u", preferir: "gemini" });

    expect(texto).toBe("resposta do groq (fallback)");
  });

  it("lança erro quando os dois provedores falham", async () => {
    envMock.GROQ_API_KEY = "chave-groq";
    envMock.GEMINI_API_KEY = "chave-gemini";
    groqCreateMock.mockRejectedValue(new Error("falhou"));
    geminiGenerateMock.mockRejectedValue(new Error("falhou"));

    await expect(gerarComIA({ sistema: "s", usuario: "u" })).rejects.toThrow(
      "Todas as tentativas de geração falharam"
    );
  });
});
