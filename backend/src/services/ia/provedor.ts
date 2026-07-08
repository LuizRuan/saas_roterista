import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { notificarErroCritico } from "../alerta";

/**
 * Abstração do provedor de IA — tenta Groq primeiro, fallback para Gemini.
 * C3: timeout de 25s por chamada — evita requests travadas indefinidamente.
 */

let groqClient: Groq | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

const TIMEOUT_MS = 25_000; // 25 segundos por chamada

function getGroq(): Groq | null {
  if (!env.GROQ_API_KEY) return null;
  if (!groqClient) groqClient = new Groq({ apiKey: env.GROQ_API_KEY });
  return groqClient;
}

function getGemini(): GoogleGenerativeAI | null {
  if (!env.GEMINI_API_KEY) return null;
  if (!geminiClient) geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return geminiClient;
}

export interface MensagemIA {
  sistema: string;
  usuario: string;
  /**
   * Qual provedor tentar primeiro. O outro continua como fallback.
   * Permite usar modelos diferentes para criador e crítico (segunda opinião
   * real, em vez do crítico avaliar com o mesmo modelo que gerou).
   */
  preferir?: "groq" | "gemini";
}

/** Promessa que rejeita após TIMEOUT_MS com mensagem clara. */
function comTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`[ia] ${label} excedeu ${TIMEOUT_MS / 1000}s de timeout.`)),
        TIMEOUT_MS
      )
    ),
  ]);
}

/** Gera com Groq (Llama 3.3 70B — rápido). Retorna null se indisponível/falhar. */
async function tentarGroq(mensagem: MensagemIA): Promise<string | null> {
  const groq = getGroq();
  if (!groq) return null;
  try {
    const resposta = await comTimeout(
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: mensagem.sistema },
          { role: "user", content: mensagem.usuario },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
      "Groq"
    );
    return resposta.choices[0]?.message?.content ?? null;
  } catch (erroGroq) {
    logger.warn("ia", "Groq falhou", { erro: (erroGroq as Error).message });
    return null;
  }
}

/** Gera com Gemini (fallback / segunda opinião). Retorna null se indisponível/falhar. */
async function tentarGemini(mensagem: MensagemIA): Promise<string | null> {
  const gemini = getGemini();
  if (!gemini) return null;
  try {
    const modelo = gemini.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
        responseMimeType: "application/json",
      },
    });
    const resposta = await comTimeout(
      modelo.generateContent(`${mensagem.sistema}\n\n---\n\n${mensagem.usuario}`),
      "Gemini"
    );
    return resposta.response.text() || null;
  } catch (erroGemini) {
    logger.warn("ia", "Gemini falhou", { erro: (erroGemini as Error).message });
    return null;
  }
}

/**
 * Tenta gerar com o provedor preferido primeiro; se falhar, tenta o outro.
 * `preferir` permite criador e crítico rodarem em modelos diferentes.
 */
export async function gerarComIA(mensagem: MensagemIA): Promise<string> {
  if (!getGroq() && !getGemini()) {
    throw new Error("Nenhuma chave de IA configurada (GROQ_API_KEY ou GEMINI_API_KEY).");
  }

  const ordem =
    mensagem.preferir === "gemini"
      ? [tentarGemini, tentarGroq]
      : [tentarGroq, tentarGemini];

  for (const tentar of ordem) {
    const texto = await tentar(mensagem);
    if (texto) return texto;
  }

  notificarErroCritico("IA fora do ar", {
    motivo: "Groq e Gemini falharam na mesma chamada",
  });
  throw new Error("Todas as tentativas de geração falharam.");
}
