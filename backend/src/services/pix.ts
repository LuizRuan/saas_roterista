import crypto from "node:crypto";
import { env } from "../config/env";

/**
 * Geração e validação segura de códigos PIX.
 *
 * Cada código é único (timestamp hex + 16 bytes aleatórios) e acompanhado de
 * um HMAC-SHA256 que vincula o código à assinatura e ao valor — sem a chave
 * secreta (PIX_HMAC_SECRET), ninguém consegue forjar um código válido.
 */

/**
 * Gera um código PIX único e seu HMAC de integridade.
 *
 * Formato: GANCHO-{timestamp_hex}-{random_32chars}
 * - Identificável visualmente como código do Gancho
 * - Único por construção (timestamp + randomBytes)
 * - Não contém dados sensíveis
 */
export function gerarCodigoPix(assinaturaId: string, valor: number) {
  const timestamp = Date.now().toString(16);
  const aleatorio = crypto.randomBytes(16).toString("hex");

  const codigo = `GANCHO-${timestamp}-${aleatorio}`.toUpperCase();

  const hmac = crypto
    .createHmac("sha256", env.PIX_HMAC_SECRET)
    .update(`${assinaturaId}:${codigo}:${valor}`)
    .digest("hex");

  return { codigo, hmac };
}

/**
 * Valida que o código PIX pertence à assinatura informada.
 *
 * Usa comparação de tempo constante (timingSafeEqual) para evitar
 * timing attacks — sem isso, um atacante poderia descobrir o HMAC
 * correto byte a byte medindo o tempo de resposta.
 */
export function validarHmacPix(
  assinaturaId: string,
  codigo: string,
  valor: number,
  hmacRecebido: string
): boolean {
  const hmacEsperado = crypto
    .createHmac("sha256", env.PIX_HMAC_SECRET)
    .update(`${assinaturaId}:${codigo}:${valor}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hmacEsperado, "hex"),
      Buffer.from(hmacRecebido, "hex")
    );
  } catch {
    // Tamanhos diferentes → falso
    return false;
  }
}
