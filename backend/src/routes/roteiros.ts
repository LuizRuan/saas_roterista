import { Router, type RequestHandler } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { z } from "zod";
import { autenticar } from "../middleware/autenticar";
import { validarBody, validarObjectIdParam } from "../middleware/validar";
import { RoteiroModel, roteiroPublico } from "../models/roteiro";
import { UsuarioModel } from "../models/usuario";
import { executarPipeline } from "../services/ia/pipeline";
import { getPadroesAtivos } from "../services/cache-padroes";
import { agendarLimpezaRoteiros } from "../services/cleanup";
import { reservarUsoMensal, liberarUsoMensal, inicioDoMes } from "../services/uso-mensal";
import { env } from "../config/env";

const LIMITE_MENSAL_FREE = 5;

/** Envolve handler async para o Express 4 capturar erros rejeitados. */
function rotaAsync(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/**
 * Limite por usuário (com fallback por IP) na rota de geração — o contador
 * mensal em uso-mensal.ts já trava o plano free, mas nada limitava rajadas
 * de chamadas caras à IA (nem para contas admin, sem limite mensal).
 */
const limiteGeracao = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  keyGenerator: (req) => req.usuarioId ?? ipKeyGenerator(req.ip ?? "anon"),
  message: { erro: "Muitas gerações em pouco tempo. Aguarde alguns minutos." },
});

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
 * C1: plano vem do documento já buscado por reservarUsoMensal — sem query extra
 * C4: padrões virais vêm do cache (5 min)
 * M2: Cache-Control explícito
 */
roteirosRouter.post(
  "/gerar",
  autenticar,
  limiteGeracao,
  validarBody(gerarSchema),
  rotaAsync(async (req, res) => {
    res.set("Cache-Control", "no-store"); // M2

    if (!env.GROQ_API_KEY && !env.GEMINI_API_KEY) {
      res.status(503).json({
        erro: "Geração de roteiros indisponível. Chaves de IA não configuradas.",
      });
      return;
    }

    const usuarioId = req.usuarioId!;
    const papel = req.usuarioPapel;

    // Reserva atômica da vaga mensal — fecha a race condition de
    // requisições concorrentes (ver services/uso-mensal.ts). Continua rodando
    // pra plano "pro" (pra manter o contador de uso correto), mas só bloqueia
    // quem não é admin nem pro.
    let usadosNoMes = 0;
    let ilimitado = papel === "admin";
    if (papel !== "admin") {
      const reserva = await reservarUsoMensal(usuarioId);
      usadosNoMes = reserva.quantidade;
      ilimitado = reserva.plano === "pro";

      if (!ilimitado && usadosNoMes > LIMITE_MENSAL_FREE) {
        res.status(429).json({
          erro: `Você atingiu o limite de ${LIMITE_MENSAL_FREE} roteiros por mês no plano gratuito. Novos roteiros liberam no próximo mês.`,
          limite: LIMITE_MENSAL_FREE,
          usados: LIMITE_MENSAL_FREE,
        });
        return;
      }
    }

    const config = req.body;

    let resultado;
    try {
      // C4: padrões do cache — sem query ao banco quando cache válido
      const padroes = await getPadroesAtivos();
      resultado = await executarPipeline(config, padroes);
    } catch (erro) {
      // Geração falhou — libera a vaga reservada para não consumir o limite
      // mensal do usuário por uma falha da IA.
      if (papel !== "admin") await liberarUsoMensal(usuarioId);
      throw erro;
    }

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

    res.json({
      roteiro: roteiroPublico(roteiroSalvo),
      avaliacao: {
        notas: resultado.avaliacao.notas,
        notaFinal: resultado.avaliacao.notaFinal,
        aprovado: resultado.avaliacao.aprovado,
        tentativas: resultado.tentativas,
      },
      uso: {
        usadosNoMes: papel === "admin" ? 0 : usadosNoMes,
        limiteMensal: ilimitado ? null : LIMITE_MENSAL_FREE,
      },
    });
  })
);

/**
 * GET /roteiros/meus
 * I2: .select() — apenas campos da listagem, sem textos completos (200B vs 3.5KB/doc)
 * M2: Cache-Control explícito
 */
roteirosRouter.get(
  "/meus",
  autenticar,
  rotaAsync(async (req, res) => {
    res.set("Cache-Control", "private, no-store"); // M2

    // P7: dispara limpeza em background (máx 1x/hora)
    agendarLimpezaRoteiros();

    // I2: projeção — sem gancho/problema/virada/prova/cta na listagem
    // Em paralelo — as 3 queries são independentes entre si.
    const [roteiros, usadosNoMes, usuario] = await Promise.all([
      RoteiroModel.find({ usuarioId: req.usuarioId })
        .sort({ createdAt: -1 })
        .limit(50)
        .select("tema formato tom notaFinal aprovado tentativas notas criadoEm createdAt"),
      RoteiroModel.countDocuments({
        usuarioId: req.usuarioId,
        createdAt: { $gte: inicioDoMes() },
      }),
      // Query isolada e pequena — só pra saber se o plano é "pro" (sem limite).
      UsuarioModel.findById(req.usuarioId).select("plano").lean(),
    ]);
    const ilimitado = req.usuarioPapel === "admin" || usuario?.plano === "pro";

    res.json({
      roteiros: roteiros.map(roteiroPublico),
      uso: {
        usadosNoMes,
        limiteMensal: ilimitado ? null : LIMITE_MENSAL_FREE,
      },
    });
  })
);

/**
 * GET /roteiros/:id
 * Busca roteiro completo (com todos os textos) — chamado ao expandir um card.
 */
roteirosRouter.get(
  "/:id",
  autenticar,
  validarObjectIdParam("id"),
  rotaAsync(async (req, res) => {
    res.set("Cache-Control", "private, no-store");

    const roteiro = await RoteiroModel.findOne({
      _id: req.params.id,
      usuarioId: req.usuarioId,
    });

    if (!roteiro) {
      res.status(404).json({ erro: "Roteiro não encontrado." });
      return;
    }

    res.json({ roteiro: roteiroPublico(roteiro) });
  })
);

/**
 * DELETE /roteiros/:id
 */
roteirosRouter.delete(
  "/:id",
  autenticar,
  validarObjectIdParam("id"),
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
