import { Router, type RequestHandler } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { autenticar } from "../middleware/autenticar";
import { validarObjectIdParam } from "../middleware/validar";
import { UsuarioModel } from "../models/usuario";
import { PagamentoModel, type PagamentoDoc } from "../models/pagamento";
import {
  pagamentoConfigurado,
  criarPagamentoPix,
  consultarPagamento,
  validarAssinaturaWebhook,
} from "../services/mercadopago";
import { env } from "../config/env";
import { logger } from "../lib/logger";

const QR_TTL_MS = 30 * 60 * 1000; // 30 min de validade do QR
const PRO_DURACAO_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias de pro

/** Envolve handler async para o Express 4 capturar erros rejeitados. */
function rotaAsync(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/** Sem token do Mercado Pago, a feature está desligada — 503 amigável. */
const exigirPagamentoConfigurado: RequestHandler = (_req, res, next) => {
  if (!pagamentoConfigurado()) {
    res.status(503).json({ erro: "Pagamentos indisponíveis no momento." });
    return;
  }
  next();
};

// Freio contra criação em rajada de cobranças (por usuário, fallback por IP).
const limiteCriar = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  keyGenerator: (req) => req.usuarioId ?? ipKeyGenerator(req.ip ?? "anon"),
  message: { erro: "Muitas tentativas de pagamento. Aguarde alguns minutos." },
});

/**
 * Coração da concessão do pro — usado tanto pelo webhook quanto pelo polling de
 * status (fallback caso o webhook nunca chegue). Consulta o status REAL no
 * Mercado Pago, confere o valor e concede o pro de forma **idempotente**: só
 * quem vencer a trava atômica `planoConcedido` estende o plano.
 *
 * Retorna o status resultante do pagamento local.
 */
async function sincronizarPagamento(
  pagamento: PagamentoDoc
): Promise<"pendente" | "aprovado" | "cancelado"> {
  if (pagamento.planoConcedido) return "aprovado";

  const mp = await consultarPagamento(pagamento.mpPaymentId);
  if (!mp) return "pendente";

  if (mp.status !== "approved") {
    if (mp.status === "cancelled" || mp.status === "rejected") {
      await PagamentoModel.updateOne({ _id: pagamento._id }, { $set: { status: "cancelado" } });
      return "cancelado";
    }
    return "pendente";
  }

  // Confere o valor pago contra o preço registrado na criação.
  if (mp.valorCentavos !== pagamento.valorCentavos) {
    logger.error("pagamentos", "Valor pago diverge do esperado — não concedendo pro", {
      mpPaymentId: pagamento.mpPaymentId,
      esperado: pagamento.valorCentavos,
      recebido: mp.valorCentavos,
    });
    return "pendente";
  }

  // Trava atômica de idempotência: só quem virar o flag concede o pro.
  const claim = await PagamentoModel.findOneAndUpdate(
    { mpPaymentId: pagamento.mpPaymentId, planoConcedido: false },
    { $set: { planoConcedido: true, status: "aprovado" } },
    { new: true }
  );
  if (!claim) return "aprovado"; // outra execução já concedeu

  // Estende a partir do vencimento atual (se ainda pro) ou de agora — não perde
  // dias quem paga adiantado.
  const usuario = await UsuarioModel.findById(pagamento.usuarioId).select("planoExpiraEm");
  const base = Math.max(Date.now(), usuario?.planoExpiraEm?.getTime() ?? 0);
  const novaExpiracao = new Date(base + PRO_DURACAO_MS);

  await UsuarioModel.updateOne(
    { _id: pagamento.usuarioId },
    { $set: { plano: "pro", planoExpiraEm: novaExpiracao } }
  );

  logger.info("pagamentos", "Plano pro concedido via Pix", {
    usuarioId: pagamento.usuarioId.toString(),
    expiraEm: novaExpiracao.toISOString(),
  });

  return "aprovado";
}

export const pagamentosRouter = Router();

/** GET /pagamentos/preco — preço atual do plano pro (fonte única no backend). */
pagamentosRouter.get("/preco", (_req, res) => {
  res.json({ valorCentavos: env.PLANO_PRO_PRECO_CENTAVOS });
});

/**
 * POST /pagamentos/criar-pix
 * Cria uma cobrança Pix do plano pro e devolve o copia-e-cola + imagem do QR.
 */
pagamentosRouter.post(
  "/criar-pix",
  autenticar,
  exigirPagamentoConfigurado,
  limiteCriar,
  rotaAsync(async (req, res) => {
    res.set("Cache-Control", "no-store");

    const usuario = await UsuarioModel.findById(req.usuarioId).select("email");
    if (!usuario) {
      res.status(401).json({ erro: "Conta não encontrada." });
      return;
    }

    const valorCentavos = env.PLANO_PRO_PRECO_CENTAVOS;
    const expiraEm = new Date(Date.now() + QR_TTL_MS);

    const pix = await criarPagamentoPix(valorCentavos, usuario.email, expiraEm);

    const pagamento = await PagamentoModel.create({
      usuarioId: usuario._id,
      mpPaymentId: pix.mpPaymentId,
      valorCentavos,
      status: "pendente",
      expiraEm,
    });

    res.status(201).json({
      pagamentoId: pagamento._id.toString(),
      copiaECola: pix.copiaECola,
      qrCodeBase64: pix.qrCodeBase64,
      valorCentavos,
      expiraEm: expiraEm.toISOString(),
    });
  })
);

/**
 * GET /pagamentos/status/:id
 * O frontend faz polling aqui. Se ainda pendente, consulta o Mercado Pago
 * direto (fallback) — assim um webhook perdido não deixa o usuário pagando
 * sem receber o pro.
 */
pagamentosRouter.get(
  "/status/:id",
  autenticar,
  validarObjectIdParam("id"),
  rotaAsync(async (req, res) => {
    res.set("Cache-Control", "no-store");

    const pagamento = await PagamentoModel.findOne({
      _id: req.params.id,
      usuarioId: req.usuarioId, // IDOR: só o dono vê o próprio pagamento
    });
    if (!pagamento) {
      res.status(404).json({ erro: "Pagamento não encontrado." });
      return;
    }

    // Fallback ao webhook: enquanto pendente, confirma direto no MP.
    if (pagamento.status === "pendente" && pagamentoConfigurado()) {
      const resultado = await sincronizarPagamento(pagamento);
      if (resultado !== "pendente") {
        res.json({ status: resultado });
        return;
      }
    }

    // Marca como expirado se o QR venceu e ninguém pagou.
    if (pagamento.status === "pendente" && pagamento.expiraEm.getTime() < Date.now()) {
      pagamento.status = "expirado";
      await pagamento.save();
    }

    res.json({ status: pagamento.status });
  })
);

/**
 * POST /pagamentos/webhook
 * Notificação do Mercado Pago. NUNCA confia no cliente — valida a assinatura e
 * delega a confirmação (consulta ao MP + concessão idempotente) para
 * sincronizarPagamento.
 */
pagamentosRouter.post(
  "/webhook",
  rotaAsync(async (req, res) => {
    const dataId =
      (req.query["data.id"] as string | undefined) ?? (req.body?.data?.id as string | undefined);

    const assinaturaOk = validarAssinaturaWebhook(
      req.headers["x-signature"] as string | undefined,
      req.headers["x-request-id"] as string | undefined,
      dataId ? String(dataId) : undefined
    );
    if (!assinaturaOk) {
      res.status(401).json({ erro: "Assinatura inválida." });
      return;
    }

    const tipo = (req.query["type"] as string | undefined) ?? req.body?.type;
    if (tipo !== "payment" || !dataId) {
      res.status(200).end();
      return;
    }

    const pagamento = await PagamentoModel.findOne({ mpPaymentId: String(dataId) });
    if (pagamento) await sincronizarPagamento(pagamento);

    // Sempre 200 para o MP parar de reenviar (a idempotência protege duplicatas).
    res.status(200).end();
  })
);
