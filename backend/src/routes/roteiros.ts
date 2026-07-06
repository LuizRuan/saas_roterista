import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { autenticar } from "../middleware/autenticar";
import { validarBody } from "../middleware/validar";
import { PadraoViralModel } from "../models/padraoViral";
import { RoteiroModel, roteiroPublico } from "../models/roteiro";
import { UsuarioModel } from "../models/usuario";
import { executarPipeline } from "../services/ia/pipeline";
import { env } from "../config/env";

const LIMITE_DIARIO_FREE = 3;

/** Envolve handler async para o Express 4 capturar erros rejeitados. */
function rotaAsync(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

const gerarSchema = z.object({
  tema: z
    .string({ required_error: "Informe o tema." })
    .trim()
    .min(3, "O tema precisa de pelo menos 3 caracteres.")
    .max(280, "O tema pode ter no máximo 280 caracteres."),
  formato: z.enum([
    "reels-30s", "reels-60s", "shorts-60s",
    "tiktok-15s", "tiktok-60s", "youtube-3min",
  ]),
  tom: z.enum(["urgente", "inspirador", "provocador", "educativo", "curioso"]),
  publico: z.string().max(80).default(""),
  palavraChave: z.string().max(60).default(""),
});

export const roteirosRouter = Router();

/**
 * POST /roteiros/gerar
 * Executa o pipeline multi-agente e salva o roteiro no banco.
 */
roteirosRouter.post(
  "/gerar",
  autenticar,
  validarBody(gerarSchema),
  rotaAsync(async (req, res) => {
    // Verifica se tem pelo menos uma chave de IA configurada
    if (!env.GROQ_API_KEY && !env.GEMINI_API_KEY) {
      res.status(503).json({
        erro: "Geração de roteiros indisponível. Chaves de IA não configuradas.",
      });
      return;
    }

    const usuarioId = req.usuarioId!;
    const papel = req.usuarioPapel;

    // Verificar limite diário (apenas para não-admins no plano free)
    if (papel !== "admin") {
      const usuario = await UsuarioModel.findById(usuarioId);
      if (usuario && usuario.plano === "free") {
        const inicioHoje = new Date();
        inicioHoje.setHours(0, 0, 0, 0);

        const usadosHoje = await RoteiroModel.countDocuments({
          usuarioId,
          createdAt: { $gte: inicioHoje },
        });

        if (usadosHoje >= LIMITE_DIARIO_FREE) {
          res.status(429).json({
            erro: `Você atingiu o limite de ${LIMITE_DIARIO_FREE} roteiros por dia no plano gratuito.`,
            limite: LIMITE_DIARIO_FREE,
            usados: usadosHoje,
          });
          return;
        }
      }
    }

    const config = req.body;

    // Busca padrões virais ativos do admin
    const padroes = await PadraoViralModel.find({ ativo: true })
      .sort({ createdAt: -1 })
      .limit(30);

    // Executa o pipeline completo
    const resultado = await executarPipeline(config, padroes);

    // Salva no banco
    const roteiroSalvo = await RoteiroModel.create({
      usuarioId,
      tema: config.tema,
      formato: config.formato,
      tom: config.tom,
      publico: config.publico,
      palavraChave: config.palavraChave,
      gancho: resultado.roteiro.gancho,
      problema: resultado.roteiro.problema,
      virada: resultado.roteiro.virada,
      prova: resultado.roteiro.prova,
      cta: resultado.roteiro.cta,
      notas: resultado.avaliacao.notas,
      notaFinal: resultado.avaliacao.notaFinal,
      aprovado: resultado.avaliacao.aprovado,
      tentativas: resultado.tentativas,
    });

    // Calcula uso diário atualizado
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    const usadosHoje = await RoteiroModel.countDocuments({
      usuarioId,
      createdAt: { $gte: inicioHoje },
    });

    res.json({
      roteiro: roteiroPublico(roteiroSalvo),
      avaliacao: {
        notas: resultado.avaliacao.notas,
        notaFinal: resultado.avaliacao.notaFinal,
        aprovado: resultado.avaliacao.aprovado,
        tentativas: resultado.tentativas,
      },
      uso: {
        usadosHoje,
        limiteDiario: papel === "admin" ? null : LIMITE_DIARIO_FREE,
      },
    });
  })
);

/**
 * GET /roteiros/meus
 * Lista os roteiros do usuário logado.
 */
roteirosRouter.get(
  "/meus",
  autenticar,
  rotaAsync(async (req, res) => {
    const roteiros = await RoteiroModel.find({ usuarioId: req.usuarioId })
      .sort({ createdAt: -1 })
      .limit(50);

    // Uso diário
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    const usadosHoje = await RoteiroModel.countDocuments({
      usuarioId: req.usuarioId,
      createdAt: { $gte: inicioHoje },
    });

    res.json({
      roteiros: roteiros.map(roteiroPublico),
      uso: {
        usadosHoje,
        limiteDiario: req.usuarioPapel === "admin" ? null : LIMITE_DIARIO_FREE,
      },
    });
  })
);

/**
 * DELETE /roteiros/:id
 * Remove um roteiro do usuário.
 */
roteirosRouter.delete(
  "/:id",
  autenticar,
  rotaAsync(async (req, res) => {
    const roteiro = await RoteiroModel.findOneAndDelete({
      _id: req.params.id,
      usuarioId: req.usuarioId,
    });
    if (!roteiro) {
      res.status(404).json({ erro: "Roteiro não encontrado." });
      return;
    }
    res.status(204).end();
  })
);
