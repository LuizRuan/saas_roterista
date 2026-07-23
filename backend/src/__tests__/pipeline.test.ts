import { beforeEach, describe, expect, it, vi } from "vitest";

// O provedor de IA é mockado — nenhuma chamada real de rede acontece. Tanto o
// criador quanto o crítico usam gerarComIA, então este único mock cobre os dois.
const gerarComIAMock = vi.fn();

vi.mock("../services/ia/provedor", () => ({
  gerarComIA: (...args: unknown[]) => gerarComIAMock(...args),
}));

const { executarPipeline } = await import("../services/ia/pipeline");
const { criarRoteiro } = await import("../services/ia/criador");
const { avaliarRoteiro } = await import("../services/ia/critico");

const config = {
  tema: "Como economizar dinheiro",
  formato: "reels-30s",
  tom: "urgente",
  publico: "",
  palavraChave: "",
};

const roteiroJson = JSON.stringify({
  gancho: "g", problema: "p", virada: "v", prova: "pr", cta: "c",
});

/** Avaliação como JSON cru (o crítico calcula a nota final a partir das notas). */
function avaliacaoJson(nota: number, melhorias: string[] = []) {
  return JSON.stringify({
    notas: { gancho: nota, retencao: nota, cta: nota, clareza: nota, adequacao: nota },
    melhorias,
  });
}

beforeEach(() => {
  gerarComIAMock.mockReset();
});

describe("executarPipeline — laço criador → crítico", () => {
  it("aprova na 1ª tentativa (nota ≥ 8) sem reescrever", async () => {
    gerarComIAMock
      .mockResolvedValueOnce(roteiroJson) // criador
      .mockResolvedValueOnce(avaliacaoJson(8)); // crítico aprova

    const resultado = await executarPipeline(config, []);

    expect(resultado.tentativas).toBe(1);
    expect(resultado.avaliacao.aprovado).toBe(true);
    expect(gerarComIAMock).toHaveBeenCalledTimes(2);
  });

  it("reprova, reescreve e aprova na 2ª — repassando o feedback ao criador", async () => {
    gerarComIAMock
      .mockResolvedValueOnce(roteiroJson) // criador 1
      .mockResolvedValueOnce(avaliacaoJson(6, ["Melhore o gancho", "Encurte o CTA"])) // crítico reprova
      .mockResolvedValueOnce(roteiroJson) // criador 2 (reescrita)
      .mockResolvedValueOnce(avaliacaoJson(8)); // crítico aprova

    const resultado = await executarPipeline(config, []);

    expect(resultado.tentativas).toBe(2);
    expect(resultado.avaliacao.aprovado).toBe(true);
    expect(gerarComIAMock).toHaveBeenCalledTimes(4);

    // A 3ª chamada é o criador da reescrita: seu prompt deve conter o feedback.
    const promptReescrita = gerarComIAMock.mock.calls[2][0].usuario as string;
    expect(promptReescrita).toContain("Melhore o gancho");
    expect(promptReescrita).toContain("Encurte o CTA");
  });

  it("reprova em todas e retorna o último roteiro no teto de tentativas", async () => {
    // Alterna criador (ímpar) / crítico com nota baixa (par) de forma
    // persistente — robusto ao valor de MAX_TENTATIVAS.
    let chamada = 0;
    gerarComIAMock.mockImplementation(() => {
      chamada++;
      return Promise.resolve(chamada % 2 === 1 ? roteiroJson : avaliacaoJson(5));
    });

    const resultado = await executarPipeline(config, []);

    expect(resultado.avaliacao.aprovado).toBe(false);
    // Esgotou as tentativas sem aprovar → reescreveu além da 1ª: pelo menos
    // 2 rodadas de (criador + crítico) = ≥4 chamadas à IA.
    expect(gerarComIAMock.mock.calls.length).toBeGreaterThanOrEqual(4);
  });
});

describe("criador / crítico — resposta inválida da IA", () => {
  it("criarRoteiro lança erro claro quando a IA não devolve JSON", async () => {
    gerarComIAMock.mockResolvedValueOnce("isto não é json");
    await expect(criarRoteiro(config, [])).rejects.toThrow("formato inválido");
  });

  it("avaliarRoteiro lança erro claro quando a IA não devolve JSON", async () => {
    gerarComIAMock.mockResolvedValueOnce("isto não é json");
    const roteiro = { gancho: "g", problema: "p", virada: "v", prova: "pr", cta: "c" };
    await expect(avaliarRoteiro(roteiro, config)).rejects.toThrow("formato inválido");
  });

  it("avaliarRoteiro normaliza notas fora de 0-10 e NaN (clamp)", async () => {
    gerarComIAMock.mockResolvedValueOnce(
      JSON.stringify({
        notas: { gancho: 99, retencao: -5, cta: "abc", clareza: 7, adequacao: 8 },
        melhorias: [],
      })
    );
    const roteiro = { gancho: "g", problema: "p", virada: "v", prova: "pr", cta: "c" };

    const avaliacao = await avaliarRoteiro(roteiro, config);

    expect(avaliacao.notas.gancho).toBe(10); // 99 → 10
    expect(avaliacao.notas.retencao).toBe(0); // -5 → 0
    expect(avaliacao.notas.cta).toBe(5); // NaN → 5
    expect(avaliacao.notas.clareza).toBe(7);
    expect(avaliacao.notas.adequacao).toBe(8);
  });
});
