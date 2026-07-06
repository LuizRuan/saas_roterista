import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env";

/**
 * Abstração do provedor de IA — tenta Groq primeiro, fallback para Gemini.
 * Ambos recebem a mesma interface: prompt de sistema + prompt do usuário → texto.
 */

let groqClient: Groq | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

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
      const resposta = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: mensagem.sistema },
          { role: "user", content: mensagem.usuario },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });

      const texto = resposta.choices[0]?.message?.content;
      if (texto) return texto;
    } catch (erroGroq) {
      console.warn("[ia] Groq falhou, tentando Gemini:", erroGroq);
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

      const resposta = await modelo.generateContent(
        `${mensagem.sistema}\n\n---\n\n${mensagem.usuario}`
      );

      const texto = resposta.response.text();
      if (texto) return texto;
    } catch (erroGemini) {
      console.error("[ia] Gemini também falhou:", erroGemini);
    }
  }

  throw new Error("Todas as tentativas de geração falharam.");
}
