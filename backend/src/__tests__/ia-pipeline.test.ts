import { describe, expect, it, vi, beforeEach } from "vitest";

const criarRoteiroMock = vi.fn();
const avaliarRoteiroMock = vi.fn();

vi.mock("../services/ia/criador", () => ({
  criarRoteiro: (...args: unknown[]) => criarRoteiroMock(...args),
}));
vi.mock("../services/ia/critico", () => ({
  avaliarRoteiro: (...args: unknown[]) => avaliarRoteiroMock(...args),
}));

const { executarPipeline } = await import("../services/ia/pipeline");

const configFake = {
  tema: "tema de teste", formato: "reels-30s", tom: "urgente", publico: "", palavraChave: "",
};

function roteiro(marca: string) {
  return { gancho: `g-${marca}`, problema: "p", virada: "v", prova: "pr", cta: "c" };
}

function avaliacao(notaFinal: number, aprovado: boolean, melhorias: string[] = []) {
  return {
    notas: { gancho: notaFinal, retencao: notaFinal, cta: notaFinal, clareza: notaFinal, adequacao: notaFinal },
    notaFinal,
    aprovado,
    melhorias,
  };
}

beforeEach(() => {
  criarRoteiroMock.mockReset();
  avaliarRoteiroMock.mockReset();
});

describe("executarPipeline", () => {
  it("aprovado na 1ª tentativa: retorna direto, sem chamar o criador de novo", async () => {
    criarRoteiroMock.mockResolvedValue(roteiro("1"));
    avaliarRoteiroMock.mockResolvedValue(avaliacao(8.5, true));

    const resultado = await executarPipeline(configFake, []);

    expect(resultado.tentativas).toBe(1);
    expect(resultado.avaliacao.notaFinal).toBe(8.5);
    expect(criarRoteiroMock).toHaveBeenCalledTimes(1);
  });

  it("reprovado e depois aprovado na 2ª: chama o criador 2x com o feedback da 1ª avaliação", async () => {
    criarRoteiroMock
      .mockResolvedValueOnce(roteiro("1"))
      .mockResolvedValueOnce(roteiro("2"));
    avaliarRoteiroMock
      .mockResolvedValueOnce(avaliacao(6.5, false, ["Melhore o gancho."]))
      .mockResolvedValueOnce(avaliacao(8.9, true));

    const resultado = await executarPipeline(configFake, []);

    expect(resultado.tentativas).toBe(2);
    expect(resultado.roteiro.gancho).toBe("g-2");
    expect(criarRoteiroMock).toHaveBeenCalledTimes(2);
    // 2ª chamada de criarRoteiro recebe o feedback montado a partir das melhorias da 1ª avaliação
    const feedbackRecebido = criarRoteiroMock.mock.calls[1][2] as string;
    expect(feedbackRecebido).toContain("Melhore o gancho.");
  });

  it("esgota as tentativas sem aprovar: retorna a MELHOR tentativa, não a última", async () => {
    criarRoteiroMock
      .mockResolvedValueOnce(roteiro("1"))
      .mockResolvedValueOnce(roteiro("2-melhor"))
      .mockResolvedValueOnce(roteiro("3-pior"));
    avaliarRoteiroMock
      .mockResolvedValueOnce(avaliacao(6.0, false, ["a"]))
      .mockResolvedValueOnce(avaliacao(7.8, false, ["b"])) // melhor nota do lote
      .mockResolvedValueOnce(avaliacao(5.5, false, ["c"])); // última, mas pior

    const resultado = await executarPipeline(configFake, []);

    expect(resultado.avaliacao.notaFinal).toBe(7.8);
    expect(resultado.roteiro.gancho).toBe("g-2-melhor");
    expect(resultado.tentativas).toBe(2); // número da tentativa que produziu a melhor nota
    expect(criarRoteiroMock).toHaveBeenCalledTimes(3);
  });

  it("usa mensagem de fallback como feedback quando a avaliação não lista melhorias", async () => {
    criarRoteiroMock
      .mockResolvedValueOnce(roteiro("1"))
      .mockResolvedValueOnce(roteiro("2"));
    avaliarRoteiroMock
      .mockResolvedValueOnce(avaliacao(6.5, false, []))
      .mockResolvedValueOnce(avaliacao(8.5, true));

    await executarPipeline(configFake, []);

    const feedbackRecebido = criarRoteiroMock.mock.calls[1][2] as string;
    expect(feedbackRecebido).toContain("A nota foi 6.5/10");
  });
});
