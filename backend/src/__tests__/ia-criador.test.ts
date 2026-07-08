import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PadraoViralDoc } from "../models/padraoViral";

const gerarComIAMock = vi.fn();
vi.mock("../services/ia/provedor", () => ({
  gerarComIA: (...args: unknown[]) => gerarComIAMock(...args),
}));

const { criarRoteiro } = await import("../services/ia/criador");

const roteiroFakeJSON = JSON.stringify({
  gancho: "g", problema: "p", virada: "v", prova: "pr", cta: "c",
});

const configFake = {
  tema: "tema de teste", formato: "reels-30s", tom: "urgente", publico: "", palavraChave: "",
};

function padraoFake(titulo: string): PadraoViralDoc {
  return {
    titulo,
    formato: "reels-30s",
    tom: "urgente",
    gancho: `gancho ${titulo}`,
    problema: `problema ${titulo}`,
    virada: `virada ${titulo}`,
    prova: `prova ${titulo}`,
    cta: `cta ${titulo}`,
  } as unknown as PadraoViralDoc;
}

beforeEach(() => {
  gerarComIAMock.mockReset();
  gerarComIAMock.mockResolvedValue(roteiroFakeJSON);
});

describe("criarRoteiro", () => {
  it("limita o prompt a no máximo 3 padrões de referência, mesmo com mais disponíveis", async () => {
    const padroes = ["A", "B", "C", "D", "E", "F"].map(padraoFake);

    await criarRoteiro(configFake, padroes);

    const promptUsuario = gerarComIAMock.mock.calls[0][0].usuario as string;
    const ocorrencias = (promptUsuario.match(/--- PADRÃO \d+:/g) ?? []).length;
    expect(ocorrencias).toBe(3);
  });

  it("sem padrões disponíveis, cai no texto padrão sem quebrar", async () => {
    await criarRoteiro(configFake, []);

    const promptUsuario = gerarComIAMock.mock.calls[0][0].usuario as string;
    expect(promptUsuario).toContain("Nenhum padrão de referência disponível.");
  });

  it("com feedbackMelhoria, pede reescrita em vez de criação nova", async () => {
    await criarRoteiro(configFake, [], "1. Melhore o gancho.");

    const promptUsuario = gerarComIAMock.mock.calls[0][0].usuario as string;
    expect(promptUsuario).toContain("REESCRITA NECESSÁRIA");
    expect(promptUsuario).toContain("1. Melhore o gancho.");
  });

  it("sem feedbackMelhoria, pede criação normal", async () => {
    await criarRoteiro(configFake, []);

    const promptUsuario = gerarComIAMock.mock.calls[0][0].usuario as string;
    expect(promptUsuario).not.toContain("REESCRITA NECESSÁRIA");
    expect(promptUsuario).toContain("Crie o roteiro seguindo a estrutura viral");
  });

  it("chama gerarComIA preferindo o Groq (rápido)", async () => {
    await criarRoteiro(configFake, []);

    expect(gerarComIAMock).toHaveBeenCalledWith(
      expect.objectContaining({ preferir: "groq" })
    );
  });

  it("lança erro quando a IA responde com JSON inválido", async () => {
    gerarComIAMock.mockResolvedValue("isso não é json");

    await expect(criarRoteiro(configFake, [])).rejects.toThrow(
      "A IA retornou um formato inválido"
    );
  });
});
