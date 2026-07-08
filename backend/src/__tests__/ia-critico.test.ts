import { describe, expect, it, vi, beforeEach } from "vitest";

const gerarComIAMock = vi.fn();
vi.mock("../services/ia/provedor", () => ({
  gerarComIA: (...args: unknown[]) => gerarComIAMock(...args),
}));

const { avaliarRoteiro } = await import("../services/ia/critico");

const roteiroFake = {
  gancho: "g", problema: "p", virada: "v", prova: "pr", cta: "c",
};
const configFake = {
  tema: "tema de teste", formato: "reels-30s", tom: "urgente", publico: "", palavraChave: "",
};

beforeEach(() => {
  gerarComIAMock.mockReset();
});

describe("avaliarRoteiro", () => {
  it("preserva uma casa decimal nas notas em vez de arredondar pra inteiro", async () => {
    gerarComIAMock.mockResolvedValue(
      JSON.stringify({
        notas: { gancho: 8.44, retencao: 7.16, cta: 9.09, clareza: 6.71, adequacao: 8.35 },
        melhorias: [],
      })
    );

    const avaliacao = await avaliarRoteiro(roteiroFake, configFake);

    // Math.round(n * 10) / 10 — 8.44 -> 8.4, 7.16 -> 7.2, 9.09 -> 9.1, 6.71 -> 6.7, 8.35 -> 8.4 (banker's não, arredonda pra cima)
    expect(avaliacao.notas.gancho).toBe(8.4);
    expect(avaliacao.notas.retencao).toBe(7.2);
    expect(avaliacao.notas.cta).toBe(9.1);
    expect(avaliacao.notas.clareza).toBe(6.7);
  });

  it("limita as notas a 0-10 mesmo se a IA mandar valores fora do range", async () => {
    gerarComIAMock.mockResolvedValue(
      JSON.stringify({
        notas: { gancho: -3, retencao: 15, cta: 5, clareza: 5, adequacao: 5 },
        melhorias: [],
      })
    );

    const avaliacao = await avaliarRoteiro(roteiroFake, configFake);

    expect(avaliacao.notas.gancho).toBe(0);
    expect(avaliacao.notas.retencao).toBe(10);
  });

  it("usa nota 5 como fallback quando o campo vem ausente ou não numérico", async () => {
    gerarComIAMock.mockResolvedValue(
      JSON.stringify({ notas: { gancho: "n/a" }, melhorias: [] })
    );

    const avaliacao = await avaliarRoteiro(roteiroFake, configFake);

    expect(avaliacao.notas.gancho).toBe(5);
    expect(avaliacao.notas.retencao).toBe(5); // nem veio no JSON
  });

  it("calcula a nota final como média ponderada (25/25/20/15/15)", async () => {
    gerarComIAMock.mockResolvedValue(
      JSON.stringify({
        notas: { gancho: 8, retencao: 8, cta: 8, clareza: 8, adequacao: 8 },
        melhorias: [],
      })
    );

    const avaliacao = await avaliarRoteiro(roteiroFake, configFake);

    expect(avaliacao.notaFinal).toBe(8);
  });

  it("aprova só quando a nota final é >= 8.0", async () => {
    gerarComIAMock.mockResolvedValueOnce(
      JSON.stringify({
        notas: { gancho: 7.9, retencao: 7.9, cta: 7.9, clareza: 7.9, adequacao: 7.9 },
        melhorias: ["melhorar X"],
      })
    );
    const reprovado = await avaliarRoteiro(roteiroFake, configFake);
    expect(reprovado.aprovado).toBe(false);

    gerarComIAMock.mockResolvedValueOnce(
      JSON.stringify({
        notas: { gancho: 8.5, retencao: 8.5, cta: 8.5, clareza: 8.5, adequacao: 8.5 },
        melhorias: [],
      })
    );
    const aprovado = await avaliarRoteiro(roteiroFake, configFake);
    expect(aprovado.aprovado).toBe(true);
  });

  it("lança erro quando a IA responde com JSON inválido", async () => {
    gerarComIAMock.mockResolvedValue("isso não é json");

    await expect(avaliarRoteiro(roteiroFake, configFake)).rejects.toThrow(
      "O avaliador retornou um formato inválido"
    );
  });

  it("chama gerarComIA preferindo o Gemini (segunda opinião, modelo diferente do criador)", async () => {
    gerarComIAMock.mockResolvedValue(
      JSON.stringify({ notas: { gancho: 8, retencao: 8, cta: 8, clareza: 8, adequacao: 8 }, melhorias: [] })
    );

    await avaliarRoteiro(roteiroFake, configFake);

    expect(gerarComIAMock).toHaveBeenCalledWith(
      expect.objectContaining({ preferir: "gemini" })
    );
  });
});
