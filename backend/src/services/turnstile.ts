import { env } from "../config/env";
import { logger } from "../lib/logger";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

let avisou = false;

/**
 * Verifica o token do Cloudflare Turnstile (CAPTCHA) enviado pelo frontend.
 *
 * Sem TURNSTILE_SECRET_KEY configurada, pula a verificação (permite sempre)
 * — mesmo padrão das outras chaves opcionais do projeto (GROQ_API_KEY etc),
 * para não travar o desenvolvimento local sem conta na Cloudflare.
 */
export async function verificarTurnstile(
  token: string | undefined,
  ip?: string
): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) {
    if (!avisou) {
      logger.warn("turnstile", "TURNSTILE_SECRET_KEY não configurada — verificação de CAPTCHA pulada.");
      avisou = true;
    }
    return true;
  }

  if (!token) return false;

  const corpo = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
  });
  if (ip) corpo.set("remoteip", ip);

  try {
    const resposta = await fetch(SITEVERIFY_URL, { method: "POST", body: corpo });
    const dados = (await resposta.json()) as { success: boolean };
    return dados.success === true;
  } catch (err) {
    logger.error("turnstile", "Erro ao verificar token", { erro: (err as Error).message });
    return false;
  }
}
