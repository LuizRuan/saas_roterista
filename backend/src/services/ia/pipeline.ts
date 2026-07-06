import { criarRoteiro, type ConfigCriacao, type RoteiroGerado } from "./criador";
import { avaliarRoteiro, type AvaliacaoRoteiro } from "./critico";
import type { PadraoViralDoc } from "../../models/padraoViral";

/**
 * Pipeline multi-agente:
 *  1. Criador gera o roteiro
 *  2. Crítico avalia e dá notas
 *  3. Se nota < 8, Crítico manda melhorias → Criador reescreve (até 3 tentativas)
 *  4. Retorna roteiro + notas finais
 */

const MAX_TENTATIVAS = 3;

export interface ResultadoPipeline {
  roteiro: RoteiroGerado;
  avaliacao: AvaliacaoRoteiro;
  tentativas: number;
}

export async function executarPipeline(
  config: ConfigCriacao,
  padroes: PadraoViralDoc[]
): Promise<ResultadoPipeline> {
  let feedbackMelhoria: string | undefined;
  let ultimoRoteiro: RoteiroGerado | null = null;
  let ultimaAvaliacao: AvaliacaoRoteiro | null = null;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    console.log(`[pipeline] Tentativa ${tentativa}/${MAX_TENTATIVAS} — criando roteiro...`);

    // Agente Criador gera (ou reescreve)
    const roteiro = await criarRoteiro(config, padroes, feedbackMelhoria);
    ultimoRoteiro = roteiro;

    console.log(`[pipeline] Tentativa ${tentativa}/${MAX_TENTATIVAS} — avaliando...`);

    // Agente Crítico avalia
    const avaliacao = await avaliarRoteiro(roteiro, config);
    ultimaAvaliacao = avaliacao;

    console.log(
      `[pipeline] Tentativa ${tentativa} — nota: ${avaliacao.notaFinal} (${avaliacao.aprovado ? "APROVADO" : "REPROVADO"})`
    );

    // Aprovado → retorna
    if (avaliacao.aprovado) {
      return { roteiro, avaliacao, tentativas: tentativa };
    }

    // Última tentativa → retorna mesmo sem aprovar
    if (tentativa === MAX_TENTATIVAS) {
      return { roteiro, avaliacao, tentativas: tentativa };
    }

    // Monta o feedback para o Criador reescrever
    feedbackMelhoria = avaliacao.melhorias.length > 0
      ? avaliacao.melhorias.map((m, i) => `${i + 1}. ${m}`).join("\n")
      : `A nota foi ${avaliacao.notaFinal}/10. Melhore o gancho, a clareza e o CTA.`;
  }

  // Fallback (nunca deve chegar aqui)
  return {
    roteiro: ultimoRoteiro!,
    avaliacao: ultimaAvaliacao!,
    tentativas: MAX_TENTATIVAS,
  };
}
