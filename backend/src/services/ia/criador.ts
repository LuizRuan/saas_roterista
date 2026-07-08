import { gerarComIA } from "./provedor";
import type { PadraoViralDoc } from "../../models/padraoViral";

/**
 * Agente Criador — gera um roteiro estruturado com base nos padrões virais
 * e na configuração do usuário.
 */

export interface ConfigCriacao {
  tema: string;
  formato: string;
  tom: string;
  publico: string;
  palavraChave: string;
}

export interface RoteiroGerado {
  gancho: string;
  problema: string;
  virada: string;
  prova: string;
  cta: string;
}

/** Sorteia até `n` padrões distintos (Fisher-Yates parcial) — evita mandar
 * sempre a mesma lista na mesma ordem, o que ancora o modelo na fraseologia
 * dos exemplos e produz roteiros formulaicos entre temas diferentes. */
function amostrarPadroes(padroes: PadraoViralDoc[], n: number): PadraoViralDoc[] {
  const copia = [...padroes];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, n);
}

function montarContextoPadroes(padroes: PadraoViralDoc[]): string {
  if (padroes.length === 0) return "Nenhum padrão de referência disponível.";

  return amostrarPadroes(padroes, 3)
    .map(
      (p, i) =>
        `--- PADRÃO ${i + 1}: "${p.titulo}" (${p.formato}, tom ${p.tom}) ---\n` +
        `GANCHO: ${p.gancho}\n` +
        `PROBLEMA: ${p.problema}\n` +
        `VIRADA: ${p.virada}\n` +
        `PROVA: ${p.prova}\n` +
        `CTA: ${p.cta}`
    )
    .join("\n\n");
}

const SISTEMA = `Você é um roteirista especialista em vídeos curtos virais para redes sociais.
Sua missão é criar roteiros que prendem o espectador desde o primeiro segundo e maximizam retenção, compartilhamento e engajamento.

REGRAS:
- Responda APENAS com JSON válido no formato especificado.
- Cada seção deve ser texto direto, como se fosse lido pelo criador no vídeo.
- O gancho DEVE ser impactante nos primeiros 3 segundos — é a diferença entre swipe e assistir.
- Use linguagem natural, conversacional, adaptada ao tom pedido.
- Nunca use emojis nem hashtags no roteiro.
- Nunca copie os padrões de referência — use-os apenas como inspiração estrutural.
- EVITE frases de transição genéricas e intercambiáveis como "existe um segredo que...", "a chave é...", "mas a verdade é que...", "a maioria pensa X, mas na verdade é Y". Elas servem pra qualquer tema e deixam o roteiro sem personalidade.
- A VIRADA e a PROVA devem trazer um detalhe concreto e específico DESTE tema (um número real, um exemplo, um passo prático) — algo que não caberia num roteiro de outro assunto.

FORMATO DE RESPOSTA (JSON):
{
  "gancho": "texto do gancho (0-3s)",
  "problema": "desenvolvimento do problema (3-12s)",
  "virada": "informação que surpreende (12-25s)",
  "prova": "credibilidade e exemplo concreto (25-45s)",
  "cta": "chamada para ação direta (45s+)"
}`;

export async function criarRoteiro(
  config: ConfigCriacao,
  padroes: PadraoViralDoc[],
  feedbackMelhoria?: string
): Promise<RoteiroGerado> {
  const contextoPadroes = montarContextoPadroes(padroes);

  let promptUsuario =
    `PADRÕES DE REFERÊNCIA (use como inspiração estrutural, NÃO copie):\n${contextoPadroes}\n\n` +
    `--- CONFIGURAÇÃO DO ROTEIRO ---\n` +
    `Tema: ${config.tema}\n` +
    `Formato: ${config.formato}\n` +
    `Tom narrativo: ${config.tom}\n`;

  if (config.publico) {
    promptUsuario += `Público-alvo: ${config.publico}\n`;
  }
  if (config.palavraChave) {
    promptUsuario += `Palavra-chave/gancho principal: ${config.palavraChave}\n`;
  }

  if (feedbackMelhoria) {
    promptUsuario +=
      `\n--- REESCRITA NECESSÁRIA ---\n` +
      `O roteiro anterior não atingiu a nota mínima. Aqui estão as melhorias que o avaliador pediu:\n` +
      `${feedbackMelhoria}\n` +
      `Reescreva o roteiro inteiro incorporando TODAS essas melhorias.`;
  } else {
    promptUsuario += `\nCrie o roteiro seguindo a estrutura viral dos padrões de referência.`;
  }

  const respostaTexto = await gerarComIA({
    sistema: SISTEMA,
    usuario: promptUsuario,
  });

  // Parse do JSON
  try {
    const parsed = JSON.parse(respostaTexto);
    return {
      gancho: String(parsed.gancho ?? ""),
      problema: String(parsed.problema ?? ""),
      virada: String(parsed.virada ?? ""),
      prova: String(parsed.prova ?? ""),
      cta: String(parsed.cta ?? ""),
    };
  } catch {
    throw new Error("A IA retornou um formato inválido. Tente novamente.");
  }
}
