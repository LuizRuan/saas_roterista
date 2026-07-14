import { Router, type RequestHandler } from "express";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { autenticar } from "../middleware/autenticar";
import { validarObjectIdParam } from "../middleware/validar";
import { AssinaturaModel } from "../models/assinatura";
import { UsuarioModel } from "../models/usuario";
import { gerarCodigoPix } from "../services/pix";
import { gerarQRCodeBase64 } from "../services/qrcode";
import { env } from "../config/env";
import { logger } from "../lib/logger";

const PIX_EXPIRACAO_MS = 15 * 60 * 1000; // 15 minutos

/** Envolve handler async para o Express 4 capturar erros rejeitados. */
function rotaAsync(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/** Sem banco conectado, devolve 503 amigável. */
const exigirBanco: RequestHandler = (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      erro: "Banco de dados indisponível.",
    });
    return;
  }
  next();
};

/**
 * Rate limit por usuário — máximo 5 gerações de PIX por hora.
 * Evita spam de códigos PIX e abuso de recursos (QR code, banco).
 */
const limitePix = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  keyGenerator: (req) => req.usuarioId ?? "anon",
  message: { erro: "Muitas tentativas de pagamento. Aguarde uma hora." },
});

/**
 * Rate limit no polling de status — máximo 120 req/min por usuário.
 * O frontend faz polling a cada 5s (~12 req/min), então 120 dá margem
 * sem permitir abuso.
 */
const limitePolling = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  keyGenerator: (req) => req.usuarioId ?? "anon",
  message: { erro: "Muitas consultas. Aguarde um momento." },
});

export const pagamentosRouter = Router();

pagamentosRouter.use(autenticar, exigirBanco);

// ─── POST /pagamentos/pix ─────────────────────────────────────────────────────
// Gera código PIX para upgrade ao plano Pro.

pagamentosRouter.post(
  "/pix",
  limitePix,
  rotaAsync(async (req, res) => {
    res.set("Cache-Control", "no-store");

    const usuarioId = req.usuarioId!;

    // Verifica se já é Pro
    const usuario = await UsuarioModel.findById(usuarioId).select("plano");
    if (!usuario) {
      res.status(401).json({ erro: "Conta não encontrada." });
      return;
    }
    if (usuario.plano === "pro") {
      res.status(409).json({ erro: "Você já possui o plano Pro." });
      return;
    }

    // Idempotência — se já existe pagamento pendente válido, retorna ele
    const pendente = await AssinaturaModel.findOne({
      usuarioId,
      status: "pendente",
      expiraEm: { $gt: new Date() },
    });

    if (pendente) {
      const qrCodeBase64 = await gerarQRCodeBase64(pendente.pixCopiaECola);
      res.json({
        assinaturaId: pendente._id.toString(),
        pixCopiaECola: pendente.pixCopiaECola,
        qrCodeBase64,
        expiraEm: pendente.expiraEm,
        valor: pendente.valor,
      });
      return;
    }

    const valor = env.PIX_VALOR_PRO_CENTAVOS;
    const expiraEm = new Date(Date.now() + PIX_EXPIRACAO_MS);

    // Chave de idempotência única por tentativa
    const idempotencyKey = `${usuarioId}-${crypto.randomUUID()}`;

    // Cria a assinatura primeiro para ter o ID
    const assinatura = new AssinaturaModel({
      usuarioId,
      plano: "pro",
      valor,
      status: "pendente",
      pixCopiaECola: "", // preenchido logo abaixo
      pixHash: "",
      expiraEm,
      idempotencyKey,
    });

    // Gera código PIX + HMAC vinculado ao ID da assinatura
    const { codigo, hmac } = gerarCodigoPix(assinatura._id.toString(), valor);
    assinatura.pixCopiaECola = codigo;
    assinatura.pixHash = hmac;

    await assinatura.save();

    // Gera QR code
    const qrCodeBase64 = await gerarQRCodeBase64(codigo);

    logger.info("pagamento", "PIX gerado", {
      assinaturaId: assinatura._id.toString(),
      usuarioId,
    });

    res.status(201).json({
      assinaturaId: assinatura._id.toString(),
      pixCopiaECola: codigo,
      qrCodeBase64,
      expiraEm,
      valor,
    });
  })
);

// ─── GET /pagamentos/:id/status ───────────────────────────────────────────────
// Polling do status do pagamento.

pagamentosRouter.get(
  "/:id/status",
  limitePolling,
  validarObjectIdParam("id"),
  rotaAsync(async (req, res) => {
    res.set("Cache-Control", "no-store");

    const assinatura = await AssinaturaModel.findOne({
      _id: req.params.id,
      usuarioId: req.usuarioId,
    });

    if (!assinatura) {
      res.status(404).json({ erro: "Pagamento não encontrado." });
      return;
    }

    // Expira automaticamente se o prazo passou
    if (assinatura.status === "pendente" && assinatura.expiraEm < new Date()) {
      assinatura.status = "expirado";
      await assinatura.save();
    }

    res.json({
      status: assinatura.status,
      expiraEm: assinatura.expiraEm,
    });
  })
);

// ─── POST /pagamentos/:id/cancelar ───────────────────────────────────────────
// Cancela um pagamento pendente.

pagamentosRouter.post(
  "/:id/cancelar",
  validarObjectIdParam("id"),
  rotaAsync(async (req, res) => {
    const assinatura = await AssinaturaModel.findOne({
      _id: req.params.id,
      usuarioId: req.usuarioId,
      status: "pendente",
    });

    if (!assinatura) {
      res.status(404).json({ erro: "Pagamento pendente não encontrado." });
      return;
    }

    assinatura.status = "cancelado";
    await assinatura.save();

    logger.info("pagamento", "Pagamento cancelado pelo usuário", {
      assinaturaId: assinatura._id.toString(),
      usuarioId: req.usuarioId,
    });

    res.status(204).end();
  })
);
