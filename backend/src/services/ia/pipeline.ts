import { criarRoteiro, type ConfigCriacao, type RoteiroGerado } from "./criador";
import { avaliarRoteiro, type AvaliacaoRoteiro } from "./critico";
import type { PadraoViralDoc } from "../../models/padraoViral";
import { logger } from "../../lib/logger";

/** M3: nível info — o logger já silencia detalhes verbosos em produção via formato JSON. */
const log = (mensagem: string) => logger.info("pipeline", mensagem);

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
  // Guarda a MELHOR tentativa (maior nota), não a última — reescrever nem
  // sempre melhora, então se esgotar as tentativas devolvemos a melhor.
  let melhor: { roteiro: RoteiroGerado; avaliacao: AvaliacaoRoteiro; tentativa: number } | null = null;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    log(`Tentativa ${tentativa}/${MAX_TENTATIVAS} — criando roteiro...`);

    // Agente Criador gera (ou reescreve)
    const roteiro = await criarRoteiro(config, padroes, feedbackMelhoria);

    log(`Tentativa ${tentativa}/${MAX_TENTATIVAS} — avaliando...`);

    // Agente Crítico avalia
    const avaliacao = await avaliarRoteiro(roteiro, config);

    log(`Tentativa ${tentativa} — nota: ${avaliacao.notaFinal} (${avaliacao.aprovado ? "APROVADO" : "REPROVADO"})`);

    if (!melhor || avaliacao.notaFinal > melhor.avaliacao.notaFinal) {
      melhor = { roteiro, avaliacao, tentativa };
    }

    // Aprovado → retorna já
    if (avaliacao.aprovado) {
      return finalizar(config, roteiro, avaliacao, tentativa);
    }

    // Monta o feedback para o Criador reescrever
    feedbackMelhoria = avaliacao.melhorias.length > 0
      ? avaliacao.melhorias.map((m, i) => `${i + 1}. ${m}`).join("\n")
      : `A nota foi ${avaliacao.notaFinal}/10. Melhore o gancho, a clareza e o CTA.`;
  }

  // Esgotou as tentativas sem aprovar → devolve a melhor.
  return finalizar(config, melhor!.roteiro, melhor!.avaliacao, melhor!.tentativa);
}

/** Loga a qualidade da geração (metadata estruturada pra agregação) e retorna. */
function finalizar(
  config: ConfigCriacao,
  roteiro: RoteiroGerado,
  avaliacao: AvaliacaoRoteiro,
  tentativas: number
): ResultadoPipeline {
  logger.info("pipeline", "roteiro finalizado", {
    tema: config.tema,
    formato: config.formato,
    tom: config.tom,
    notaFinal: avaliacao.notaFinal,
    tentativas,
    aprovado: avaliacao.aprovado,
  });
  return { roteiro, avaliacao, tentativas };
}
