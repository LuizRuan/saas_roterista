import { gerarComIA } from "./provedor";
import type { RoteiroGerado, ConfigCriacao } from "./criador";

/**
 * Agente Crítico — avalia o roteiro em 5 dimensões e dá notas.
 * Se a nota final for < 8, lista melhorias específicas.
 */

export interface Notas {
  gancho: number;
  retencao: number;
  cta: number;
  clareza: number;
  adequacao: number;
}

export interface AvaliacaoRoteiro {
  notas: Notas;
  notaFinal: number;
  aprovado: boolean;
  melhorias: string[];
}

const NOTA_MINIMA = 8.0;

const SISTEMA = `Você é um avaliador especialista em roteiros de vídeos virais para redes sociais.
Sua função é analisar roteiros e dar notas justas em 5 dimensões, de 0 a 10.

DIMENSÕES DE AVALIAÇÃO:
1. GANCHO (peso 25%): Os primeiros 3 segundos prendem? Causa curiosidade, urgência ou emoção imediata?
2. RETENÇÃO (peso 25%): A estrutura problema→virada→prova flui naturalmente? Mantém o espectador assistindo?
3. CTA (peso 20%): O call to action é claro, direto e motivador? Uma ação, sem ambiguidade?
4. CLAREZA (peso 15%): A linguagem é simples e direta? Sem enrolação ou jargão desnecessário?
5. ADEQUAÇÃO (peso 15%): O roteiro combina com o tom e formato solicitado? O tamanho é adequado?

REGRAS:
- Responda APENAS com JSON válido no formato especificado.
- Seja rigoroso mas justo — notas altas significam que o roteiro realmente é excelente.
- Dê cada nota com UMA casa decimal (ex.: 7.4, 8.6, 6.9), refletindo diferenças reais entre roteiros. EVITE números redondos como 7.0, 8.0, 9.0 — quase nenhum roteiro é exatamente redondo.
- Duas dimensões raramente merecem a mesma nota — avalie cada uma pelo seu próprio mérito.
- Se a nota final for menor que 8, liste de 2 a 4 melhorias ESPECÍFICAS e acionáveis.
- Nunca dê nota 10 em todas as dimensões — sempre há algo a melhorar.
- Cada melhoria deve dizer exatamente O QUE mudar e COMO.

FORMATO DE RESPOSTA (JSON):
{
  "notas": {
    "gancho": 8.4,
    "retencao": 7.2,
    "cta": 9.1,
    "clareza": 6.7,
    "adequacao": 8.3
  },
  "melhorias": [
    "Melhoria específica 1...",
    "Melhoria específica 2..."
  ]
}`;

export async function avaliarRoteiro(
  roteiro: RoteiroGerado,
  config: ConfigCriacao
): Promise<AvaliacaoRoteiro> {
  const promptUsuario =
    `ROTEIRO PARA AVALIAÇÃO:\n\n` +
    `GANCHO (0-3s): ${roteiro.gancho}\n\n` +
    `PROBLEMA (3-12s): ${roteiro.problema}\n\n` +
    `VIRADA (12-25s): ${roteiro.virada}\n\n` +
    `PROVA (25-45s): ${roteiro.prova}\n\n` +
    `CTA (45s+): ${roteiro.cta}\n\n` +
    `--- CONTEXTO ---\n` +
    `Tema: ${config.tema}\n` +
    `Formato: ${config.formato}\n` +
    `Tom narrativo: ${config.tom}\n` +
    (config.publico ? `Público-alvo: ${config.publico}\n` : "") +
    `\nAvalie cada dimensão de 0 a 10 e liste melhorias se necessário.`;

  const respostaTexto = await gerarComIA({
    sistema: SISTEMA,
    usuario: promptUsuario,
  });

  try {
    const parsed = JSON.parse(respostaTexto);
    const notas: Notas = {
      gancho: clamp(Number(parsed.notas?.gancho ?? 5)),
      retencao: clamp(Number(parsed.notas?.retencao ?? 5)),
      cta: clamp(Number(parsed.notas?.cta ?? 5)),
      clareza: clamp(Number(parsed.notas?.clareza ?? 5)),
      adequacao: clamp(Number(parsed.notas?.adequacao ?? 5)),
    };

    // Média ponderada
    const notaFinal = parseFloat(
      (
        notas.gancho * 0.25 +
        notas.retencao * 0.25 +
        notas.cta * 0.2 +
        notas.clareza * 0.15 +
        notas.adequacao * 0.15
      ).toFixed(1)
    );

    const melhorias: string[] = Array.isArray(parsed.melhorias)
      ? parsed.melhorias.filter((m: unknown) => typeof m === "string")
      : [];

    return {
      notas,
      notaFinal,
      aprovado: notaFinal >= NOTA_MINIMA,
      melhorias,
    };
  } catch {
    throw new Error("O avaliador retornou um formato inválido. Tente novamente.");
  }
}

function clamp(n: number): number {
  if (isNaN(n)) return 5;
  // Preserva uma casa decimal — arredondar pra inteiro colapsava toda a
  // variação e fazia roteiros diferentes convergirem pra mesma nota final.
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}
