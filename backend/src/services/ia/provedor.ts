import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

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

/** Tenta gerar com Groq; se falhar, tenta Gemini. Joga erro se os dois falharem. */
export async function gerarComIA(mensagem: MensagemIA): Promise<string> {
  const groq = getGroq();
  const gemini = getGemini();

  if (!groq && !gemini) {
    throw new Error("Nenhuma chave de IA configurada (GROQ_API_KEY ou GEMINI_API_KEY).");
  }

  // Tentativa 1: Groq (Llama 3.3 70B — rápido)
  if (groq) {
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

      const texto = resposta.choices[0]?.message?.content;
      if (texto) return texto;
    } catch (erroGroq) {
      logger.warn("ia", "Groq falhou, tentando Gemini", { erro: (erroGroq as Error).message });
    }
  }

  // Tentativa 2: Gemini (fallback)
  if (gemini) {
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

      const texto = resposta.response.text();
      if (texto) return texto;
    } catch (erroGemini) {
      logger.error("ia", "Gemini também falhou", { erro: (erroGemini as Error).message });
    }
  }

  throw new Error("Todas as tentativas de geração falharam.");
}
