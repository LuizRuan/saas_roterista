import { Router, type RequestHandler } from "express";
import { autenticar } from "../middleware/autenticar";
import { exigirAdmin } from "../middleware/exigirAdmin";
import { validarBody, validarObjectIdParam } from "../middleware/validar";
import { PadraoViralModel, padraoPublico } from "../models/padraoViral";
import { AssinaturaModel, assinaturaPublica } from "../models/assinatura";
import { UsuarioModel } from "../models/usuario";
import { padraoViralSchema } from "../schemas/admin";
import { invalidarCachePadroes } from "../services/cache-padroes";
import { validarHmacPix } from "../services/pix";
import { logger } from "../lib/logger";

/** Envolve handler async para o Express 4 capturar erros rejeitados. */
function rotaAsync(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export const adminRouter = Router();

// Todas as rotas exigem autenticação + papel admin
adminRouter.use(autenticar, exigirAdmin);

// ─── Padrões virais ─────────────────────────────────────────────────────────

/** GET /admin/padroes — lista todos os padrões (ativos e inativos) */
adminRouter.get(
  "/padroes",
  rotaAsync(async (_req, res) => {
    const padroes = await PadraoViralModel.find().sort({ createdAt: -1 });
    res.json({ padroes: padroes.map(padraoPublico) });
  })
);

/** POST /admin/padroes — cria novo padrão */
adminRouter.post(
  "/padroes",
  validarBody(padraoViralSchema),
  rotaAsync(async (req, res) => {
    const padrao = await PadraoViralModel.create(req.body);
    invalidarCachePadroes(); // C4: invalida cache
    res.status(201).json({ padrao: padraoPublico(padrao) });
  })
);

/** GET /admin/padroes/:id — busca um padrão */
adminRouter.get(
  "/padroes/:id",
  validarObjectIdParam("id"),
  rotaAsync(async (req, res) => {
    const padrao = await PadraoViralModel.findById(req.params.id);
    if (!padrao) {
      res.status(404).json({ erro: "Padrão não encontrado." });
      return;
    }
    res.json({ padrao: padraoPublico(padrao) });
  })
);

/** PATCH /admin/padroes/:id — atualiza campos do padrão */
adminRouter.patch(
  "/padroes/:id",
  validarObjectIdParam("id"),
  validarBody(padraoViralSchema.partial()),
  rotaAsync(async (req, res) => {
    const padrao = await PadraoViralModel.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!padrao) {
      res.status(404).json({ erro: "Padrão não encontrado." });
      return;
    }
    invalidarCachePadroes(); // C4: invalida cache
    res.json({ padrao: padraoPublico(padrao) });
  })
);

/** DELETE /admin/padroes/:id — remove permanentemente */
adminRouter.delete(
  "/padroes/:id",
  validarObjectIdParam("id"),
  rotaAsync(async (req, res) => {
    const padrao = await PadraoViralModel.findByIdAndDelete(req.params.id);
    if (!padrao) {
      res.status(404).json({ erro: "Padrão não encontrado." });
      return;
    }
    invalidarCachePadroes(); // C4: invalida cache
    res.status(204).end();
  })
);

// ─── Pagamentos ─────────────────────────────────────────────────────────────

/**
 * GET /admin/pagamentos/pendentes
 * Lista pagamentos pendentes para o admin conferir no extrato e confirmar.
 */
adminRouter.get(
  "/pagamentos/pendentes",
  rotaAsync(async (_req, res) => {
    const pendentes = await AssinaturaModel.find({ status: "pendente" })
      .sort({ createdAt: -1 })
      .limit(50);

    // Enriquecer com nome/email do usuário para o admin identificar
    const ids = pendentes.map((p) => p.usuarioId);
    const usuarios = await UsuarioModel.find({ _id: { $in: ids } })
      .select("nome email")
      .lean();
    const mapUsuarios = new Map(
      usuarios.map((u) => [u._id.toString(), { nome: u.nome, email: u.email }])
    );

    const lista = pendentes.map((p) => {
      const u = mapUsuarios.get(p.usuarioId.toString());
      return {
        ...assinaturaPublica(p),
        usuario: u ?? { nome: "?", email: "?" },
      };
    });

    res.json({ pagamentos: lista });
  })
);

/**
 * GET /admin/pagamentos/historico
 * Lista os últimos 100 pagamentos (todos os status) para auditoria.
 */
adminRouter.get(
  "/pagamentos/historico",
  rotaAsync(async (_req, res) => {
    const pagamentos = await AssinaturaModel.find()
      .sort({ createdAt: -1 })
      .limit(100);

    const ids = pagamentos.map((p) => p.usuarioId);
    const usuarios = await UsuarioModel.find({ _id: { $in: ids } })
      .select("nome email")
      .lean();
    const mapUsuarios = new Map(
      usuarios.map((u) => [u._id.toString(), { nome: u.nome, email: u.email }])
    );

    const lista = pagamentos.map((p) => {
      const u = mapUsuarios.get(p.usuarioId.toString());
      return {
        ...assinaturaPublica(p),
        usuario: u ?? { nome: "?", email: "?" },
      };
    });

    res.json({ pagamentos: lista });
  })
);

/**
 * POST /admin/pagamentos/:id/confirmar
 * Confirma pagamento PIX: valida HMAC anti-fraude, atualiza status para "pago"
 * e promove o usuário ao plano Pro atomicamente.
 */
adminRouter.post(
  "/pagamentos/:id/confirmar",
  validarObjectIdParam("id"),
  rotaAsync(async (req, res) => {
    const assinatura = await AssinaturaModel.findById(req.params.id);

    if (!assinatura) {
      res.status(404).json({ erro: "Pagamento não encontrado." });
      return;
    }

    if (assinatura.status === "pago") {
      res.status(409).json({ erro: "Pagamento já foi confirmado." });
      return;
    }

    if (assinatura.status !== "pendente") {
      res.status(400).json({ erro: `Pagamento com status "${assinatura.status}" não pode ser confirmado.` });
      return;
    }

    // Valida integridade do código PIX (anti-fraude)
    const hmacValido = validarHmacPix(
      assinatura._id.toString(),
      assinatura.pixCopiaECola,
      assinatura.valor,
      assinatura.pixHash
    );

    if (!hmacValido) {
      logger.error("pagamento", "HMAC inválido na confirmação — possível adulteração", {
        assinaturaId: assinatura._id.toString(),
      });
      res.status(400).json({ erro: "Código de pagamento corrompido. Contate o suporte." });
      return;
    }

    // Confirma o pagamento
    assinatura.status = "pago";
    assinatura.pagoEm = new Date();
    assinatura.confirmadoPor = "admin";
    await assinatura.save();

    // Promove o usuário ao plano Pro
    await UsuarioModel.updateOne(
      { _id: assinatura.usuarioId },
      { $set: { plano: "pro" } }
    );

    logger.info("pagamento", "Pagamento confirmado pelo admin", {
      assinaturaId: assinatura._id.toString(),
      usuarioId: assinatura.usuarioId.toString(),
      adminId: req.usuarioId,
    });

    res.json({ assinatura: assinaturaPublica(assinatura) });
  })
);

// ─── Rota pública (usuários logados) ────────────────────────────────────────
// GET /admin/padroes-ativos → usada pelo Designer para buscar padrões da IA
// (separada do adminRouter; registrada diretamente no app)

export async function listarPadroesAtivos() {
  return PadraoViralModel.find({ ativo: true }).sort({ createdAt: -1 }).limit(30);
}
