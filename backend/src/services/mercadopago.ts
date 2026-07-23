import crypto from "node:crypto";
import { env } from "../config/env";
import { logger } from "../lib/logger";

/**
 * Integração mínima com o Mercado Pago para pagamentos Pix.
 *
 * Sem MERCADOPAGO_ACCESS_TOKEN configurado, `pagamentoConfigurado()` retorna
 * false e as rotas respondem 503 — feature desligada, mesmo padrão das chaves
 * de IA (não trava o boot).
 */

const MP_API = "https://api.mercadopago.com";
const TIMEOUT_MS = 15_000;

export function pagamentoConfigurado(): boolean {
  return !!env.MERCADOPAGO_ACCESS_TOKEN;
}

export interface PixCriado {
  mpPaymentId: string;
  copiaECola: string; // qr_code — o "copia e cola"
  qrCodeBase64: string; // qr_code_base64 — imagem PNG em base64
}

/** Formata a data no padrão que o Mercado Pago aceita (ISO 8601 com offset). */
function formatarDataMP(data: Date): string {
  return data.toISOString().replace("Z", "+00:00");
}

function comTimeout(sinalExtra?: AbortSignal): AbortSignal {
  const controlador = new AbortController();
  setTimeout(() => controlador.abort(), TIMEOUT_MS);
  return sinalExtra ?? controlador.signal;
}

/** Cria uma cobrança Pix e devolve o copia-e-cola + a imagem do QR. */
export async function criarPagamentoPix(
  valorCentavos: number,
  emailPagador: string,
  expiraEm: Date
): Promise<PixCriado> {
  const resposta = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    signal: comTimeout(),
    headers: {
      Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      // Chave de idempotência: o MP não cria duas cobranças se repetir a chamada.
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      transaction_amount: Number((valorCentavos / 100).toFixed(2)),
      description: "Plano Pro — Gancho (30 dias)",
      payment_method_id: "pix",
      payer: { email: emailPagador },
      date_of_expiration: formatarDataMP(expiraEm),
    }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    logger.error("mercadopago", "Falha ao criar pagamento Pix", { status: resposta.status, detalhe });
    throw new Error("Não foi possível gerar a cobrança Pix. Tente novamente.");
  }

  const dados = (await resposta.json()) as {
    id: number;
    point_of_interaction?: {
      transaction_data?: { qr_code?: string; qr_code_base64?: string };
    };
  };

  const transacao = dados.point_of_interaction?.transaction_data;
  if (!dados.id || !transacao?.qr_code || !transacao?.qr_code_base64) {
    logger.error("mercadopago", "Resposta do MP sem dados do Pix", { id: dados.id });
    throw new Error("Resposta inesperada do provedor de pagamento.");
  }

  return {
    mpPaymentId: String(dados.id),
    copiaECola: transacao.qr_code,
    qrCodeBase64: transacao.qr_code_base64,
  };
}

export interface PagamentoMP {
  status: string; // "approved", "pending", "cancelled", "rejected"...
  valorCentavos: number;
}

/** Consulta um pagamento no MP — usado pelo webhook para confirmar o status real. */
export async function consultarPagamento(mpPaymentId: string): Promise<PagamentoMP | null> {
  const resposta = await fetch(`${MP_API}/v1/payments/${mpPaymentId}`, {
    signal: comTimeout(),
    headers: { Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}` },
  });

  if (!resposta.ok) {
    logger.error("mercadopago", "Falha ao consultar pagamento", { mpPaymentId, status: resposta.status });
    return null;
  }

  const dados = (await resposta.json()) as { status?: string; transaction_amount?: number };
  return {
    status: dados.status ?? "unknown",
    valorCentavos: Math.round((dados.transaction_amount ?? 0) * 100),
  };
}

/**
 * Valida a assinatura HMAC do webhook do Mercado Pago.
 *
 * O MP envia os cabeçalhos `x-signature` (`ts=...,v1=...`) e `x-request-id`.
 * A gente remonta o manifesto `id:<dataId>;request-id:<reqId>;ts:<ts>;`,
 * calcula o HMAC-SHA256 com o WEBHOOK_SECRET e compara — em tempo constante —
 * com o v1 recebido. Sem segredo configurado, rejeita (fail-closed).
 */
export function validarAssinaturaWebhook(
  xSignature: string | undefined,
  xRequestId: string | undefined,
  dataId: string | undefined
): boolean {
  if (!env.MERCADOPAGO_WEBHOOK_SECRET) {
    logger.error("mercadopago", "MERCADOPAGO_WEBHOOK_SECRET ausente — rejeitando webhook (fail-closed).");
    return false;
  }
  if (!xSignature || !xRequestId || !dataId) return false;

  // x-signature: "ts=1704908010,v1=abc123..."
  const partes = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [chave, valor] = p.split("=");
      return [chave?.trim(), valor?.trim()];
    })
  );
  const ts = partes["ts"];
  const v1 = partes["v1"];
  if (!ts || !v1) return false;

  const manifesto = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const esperado = crypto
    .createHmac("sha256", env.MERCADOPAGO_WEBHOOK_SECRET)
    .update(manifesto)
    .digest("hex");

  const bufEsperado = Buffer.from(esperado, "hex");
  const bufRecebido = Buffer.from(v1, "hex");
  if (bufEsperado.length !== bufRecebido.length) return false;
  return crypto.timingSafeEqual(bufEsperado, bufRecebido);
}
