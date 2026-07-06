import { Router, type RequestHandler } from "express";
import { autenticar } from "../middleware/autenticar";
import { exigirAdmin } from "../middleware/exigirAdmin";
import { validarBody } from "../middleware/validar";
import { PadraoViralModel, padraoPublico } from "../models/padraoViral";
import { padraoViralSchema } from "../schemas/admin";

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
    res.status(201).json({ padrao: padraoPublico(padrao) });
  })
);

/** GET /admin/padroes/:id — busca um padrão */
adminRouter.get(
  "/padroes/:id",
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
    res.json({ padrao: padraoPublico(padrao) });
  })
);

/** DELETE /admin/padroes/:id — remove permanentemente */
adminRouter.delete(
  "/padroes/:id",
  rotaAsync(async (req, res) => {
    const padrao = await PadraoViralModel.findByIdAndDelete(req.params.id);
    if (!padrao) {
      res.status(404).json({ erro: "Padrão não encontrado." });
      return;
    }
    res.status(204).end();
  })
);

// ─── Rota pública (usuários logados) ────────────────────────────────────────
// GET /admin/padroes-ativos → usada pelo Designer para buscar padrões da IA
// (separada do adminRouter; registrada diretamente no app)

export async function listarPadroesAtivos() {
  return PadraoViralModel.find({ ativo: true }).sort({ createdAt: -1 }).limit(30);
}
