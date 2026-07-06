import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { autenticar } from "../middleware/autenticar";
import { validarBody } from "../middleware/validar";
import { PadraoViralModel } from "../models/padraoViral";
import { executarPipeline } from "../services/ia/pipeline";
import { env } from "../config/env";

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
 * Executa o pipeline multi-agente (criador ↔ crítico) e retorna o roteiro + notas.
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

    const config = req.body;

    // Busca padrões virais ativos do admin
    const padroes = await PadraoViralModel.find({ ativo: true })
      .sort({ createdAt: -1 })
      .limit(30);

    // Executa o pipeline completo
    const resultado = await executarPipeline(config, padroes);

    res.json({
      roteiro: {
        gancho: resultado.roteiro.gancho,
        problema: resultado.roteiro.problema,
        virada: resultado.roteiro.virada,
        prova: resultado.roteiro.prova,
        cta: resultado.roteiro.cta,
      },
      avaliacao: {
        notas: resultado.avaliacao.notas,
        notaFinal: resultado.avaliacao.notaFinal,
        aprovado: resultado.avaliacao.aprovado,
        tentativas: resultado.tentativas,
      },
    });
  })
);
