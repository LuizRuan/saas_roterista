import { Router, type CookieOptions, type RequestHandler } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../config/env";
import { UsuarioModel, usuarioPublico, type UsuarioDoc } from "../models/usuario";
import { RoteiroModel } from "../models/roteiro";
import { AssinaturaModel } from "../models/assinatura";
import { cadastroSchema, loginSchema } from "../schemas/auth";
import { validarBody } from "../middleware/validar";
import { autenticar } from "../middleware/autenticar";
import {
  REFRESH_COOKIE,
  REFRESH_TTL_MS,
  gerarAccessToken,
  gerarRefreshToken,
  hashToken,
  verificarRefreshToken,
} from "../services/tokens";
import { enviarEmailRecuperacao } from "../services/email";
import { verificarTurnstile } from "../services/turnstile";
import { logger } from "../lib/logger";
import { z } from "zod";

const CUSTO_BCRYPT = 12;

// Hash "de mentira" usado para igualar o tempo de resposta quando o e-mail
// não existe — sem isso, a ausência do bcrypt.compare (que leva ~100ms)
// vaza por timing quais e-mails têm conta, mesmo com a mesma mensagem de erro.
const HASH_FALSO = bcrypt.hashSync("nenhuma-conta-com-este-email", CUSTO_BCRYPT);

// Em produção frontend (Vercel) e API (Render) ficam em sites diferentes,
// então o cookie precisa de SameSite=None + Secure. Em dev (localhost) usamos
// Strict, que é mais seguro.
const opcoesCookie: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? "none" : "strict",
  path: "/auth",
  maxAge: REFRESH_TTL_MS,
};

/** Envolve handler async para o Express 4 capturar erros rejeitados. */
function rotaAsync(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/** Sem banco conectado, devolve 503 amigável em vez de estourar timeout. */
const exigirBanco: RequestHandler = (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      erro: "Banco de dados indisponível. Configure MONGODB_URI no backend/.env.",
    });
    return;
  }
  next();
};

/**
 * Proteção CSRF pelo padrão do cabeçalho customizado: formulários HTML não
 * conseguem enviá-lo, e fetch de outra origem dispara preflight barrado pelo
 * CORS. Exigido nas rotas que dependem só do cookie (refresh/logout).
 */
const exigirCabecalhoCliente: RequestHandler = (req, res, next) => {
  if (req.headers["x-cliente"] !== "gancho-web") {
    res.status(403).json({ erro: "Origem da requisição não reconhecida." });
    return;
  }
  next();
};

/**
 * Exige um CAPTCHA (Cloudflare Turnstile) válido — usado nas rotas mais
 * visadas por bots (cadastro e recuperação de senha). Sem TURNSTILE_SECRET_KEY
 * configurada (dev), verificarTurnstile pula a checagem.
 */
const exigirTurnstile: RequestHandler = (req, res, next) => {
  verificarTurnstile(req.body?.turnstileToken, req.ip).then((ok) => {
    if (!ok) {
      res.status(400).json({ erro: "Verificação de segurança falhou. Recarregue a página e tente de novo." });
      return;
    }
    next();
  });
};

// I4: limite global por IP — 20 requests em 15 min
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  message: { erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo." },
});

// I4: limite por e-mail — 5 tentativas em 30 min (combate brute force em contas específicas)
const limitePorEmail = rateLimit({
  windowMs: 30 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  keyGenerator: (req) => {
    const email = String(req.body?.email ?? "").toLowerCase().trim();
    return email || ipKeyGenerator(req.ip ?? "anon");
  },
  message: { erro: "Conta bloqueada temporariamente por muitas tentativas. Tente em 30 minutos." },
});

export const authRouter = Router();

authRouter.use(limiteAuth, exigirBanco);

/** Gera par de tokens, persiste o hash do refresh e escreve o cookie. */
async function abrirSessao(res: Parameters<RequestHandler>[1], usuario: UsuarioDoc) {
  const papel = (usuario.papel ?? "usuario") as "usuario" | "admin";
  const accessToken = gerarAccessToken(usuario._id.toString(), papel);
  const refreshToken = gerarRefreshToken(usuario._id.toString());

  usuario.refreshTokenHash = hashToken(refreshToken);
  await usuario.save();

  res.cookie(REFRESH_COOKIE, refreshToken, opcoesCookie);
  return accessToken;
}

authRouter.post(
  "/cadastro",
  exigirTurnstile,
  validarBody(cadastroSchema),
  rotaAsync(async (req, res) => {
    const { nome, email, senha } = req.body;

    const jaExiste = await UsuarioModel.exists({ email });
    if (jaExiste) {
      res.status(409).json({ erro: "Já existe uma conta com esse e-mail." });
      return;
    }

    const senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);
    const usuario = await UsuarioModel.create({
      nome,
      email,
      senhaHash,
      termosAceitosEm: new Date(),
    });

    const accessToken = await abrirSessao(res, usuario);

    // SEC-06: log de auditoria
    logger.info("auth", "Cadastro realizado", {
      usuarioId: usuario._id.toString(),
      ip: req.ip,
    });

    res.status(201).json({ usuario: usuarioPublico(usuario), accessToken });
  })
);

authRouter.post(
  "/login",
  limitePorEmail, // I4: limite por e-mail específico
  validarBody(loginSchema),
  rotaAsync(async (req, res) => {
    const { email, senha } = req.body;

    const usuario = await UsuarioModel.findOne({ email });
    // Mesma resposta — e mesmo tempo de resposta — para e-mail inexistente e
    // senha errada: sempre roda o bcrypt.compare, mesmo sem usuário, contra
    // um hash fixo, para não revelar quais e-mails têm conta por timing.
    const senhaOk = await bcrypt.compare(senha, usuario?.senhaHash ?? HASH_FALSO);
    if (!usuario || !senhaOk) {
      res.status(401).json({ erro: "E-mail ou senha incorretos." });
      return;
    }

    const accessToken = await abrirSessao(res, usuario);

    // SEC-06: log de auditoria
    logger.info("auth", "Login bem-sucedido", {
      usuarioId: usuario._id.toString(),
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ usuario: usuarioPublico(usuario), accessToken });
  })
);

authRouter.post(
  "/refresh",
  exigirCabecalhoCliente,
  rotaAsync(async (req, res) => {
    const token: string | undefined = req.cookies?.[REFRESH_COOKIE];
    const payload = token ? verificarRefreshToken(token) : null;

    if (!token || !payload) {
      res.status(401).json({ erro: "Sessão expirada. Entre novamente." });
      return;
    }

    const usuario = await UsuarioModel.findById(payload.sub);
    if (!usuario || usuario.refreshTokenHash !== hashToken(token)) {
      // Token assinado corretamente mas já rotacionado: possível roubo de
      // cookie — revoga a sessão inteira por precaução.
      if (usuario) {
        usuario.refreshTokenHash = null;
        await usuario.save();
      }
      res.clearCookie(REFRESH_COOKIE, { ...opcoesCookie, maxAge: undefined });
      res.status(401).json({ erro: "Sessão expirada. Entre novamente." });
      return;
    }

    const accessToken = await abrirSessao(res, usuario); // rotaciona o refresh
    res.json({ usuario: usuarioPublico(usuario), accessToken });
  })
);

authRouter.post(
  "/logout",
  exigirCabecalhoCliente,
  rotaAsync(async (req, res) => {
    const token: string | undefined = req.cookies?.[REFRESH_COOKIE];
    const payload = token ? verificarRefreshToken(token) : null;

    if (payload) {
      await UsuarioModel.updateOne(
        { _id: payload.sub },
        { $set: { refreshTokenHash: null } }
      );
    }

    // SEC-06: log de auditoria
    if (payload) {
      logger.info("auth", "Logout", { usuarioId: payload.sub, ip: req.ip });
    }

    res.clearCookie(REFRESH_COOKIE, { ...opcoesCookie, maxAge: undefined });
    res.status(204).end();
  })
);

authRouter.get(
  "/eu",
  autenticar,
  rotaAsync(async (req, res) => {
    const usuario = await UsuarioModel.findById(req.usuarioId);
    if (!usuario) {
      res.status(401).json({ erro: "Conta não encontrada." });
      return;
    }
    res.json({ usuario: usuarioPublico(usuario) });
  })
);

const excluirContaSchema = z.object({
  senha: z.string().min(1, "Informe sua senha."),
});

/**
 * DELETE /auth/conta
 * Exclusão definitiva (não soft-delete) — direito ao esquecimento da LGPD,
 * prometido na Política de Privacidade. Exige reautenticação com a senha
 * atual antes de apagar, por ser uma ação irreversível.
 */
authRouter.delete(
  "/conta",
  autenticar,
  exigirCabecalhoCliente,
  validarBody(excluirContaSchema),
  rotaAsync(async (req, res) => {
    const usuario = await UsuarioModel.findById(req.usuarioId);
    if (!usuario) {
      res.status(401).json({ erro: "Conta não encontrada." });
      return;
    }

    const senhaOk = await bcrypt.compare(req.body.senha, usuario.senhaHash);
    if (!senhaOk) {
      res.status(401).json({ erro: "Senha incorreta." });
      return;
    }

    // SEC-05: limpar todos os dados do usuário (LGPD — direito ao esquecimento)
    await RoteiroModel.deleteMany({ usuarioId: usuario._id });
    await AssinaturaModel.deleteMany({ usuarioId: usuario._id });
    await UsuarioModel.findByIdAndDelete(usuario._id);

    // SEC-06: log de auditoria
    logger.info("auth", "Conta excluída pelo usuário", {
      usuarioId: usuario._id.toString(),
      ip: req.ip,
    });

    res.clearCookie(REFRESH_COOKIE, { ...opcoesCookie, maxAge: undefined });
    res.status(204).end();
  })
);

// ─── Recuperação de senha ────────────────────────────────────────────────────

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hora

const recuperarSchema = z.object({
  email: z.string().email("E-mail inválido.").transform((e) => e.toLowerCase().trim()),
});

// SEC-07: mesmas regras de senha do cadastro — sem isso, o reset aceitaria senhas fracas
const resetarSchema = z.object({
  token: z.string().min(1, "Token obrigatório."),
  novaSenha: cadastroSchema.shape.senha,
});

// SEC-08: rate limit no reset de senha — evita brute force de tokens
const limiteReset = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "anon"),
  message: { erro: "Muitas tentativas de redefinição. Aguarde 15 minutos." },
});

/**
 * POST /auth/recuperar-senha
 * Gera token + envia e-mail. Sempre retorna 200 (não revela se o e-mail existe).
 */
authRouter.post(
  "/recuperar-senha",
  exigirTurnstile,
  validarBody(recuperarSchema),
  rotaAsync(async (req, res) => {
    const { email } = req.body;

    const usuario = await UsuarioModel.findOne({ email });

    if (usuario) {
      // Gera token aleatório de 32 bytes
      const token = crypto.randomBytes(32).toString("hex");
      usuario.resetSenhaHash = crypto.createHash("sha256").update(token).digest("hex");
      usuario.resetSenhaExpira = new Date(Date.now() + RESET_TTL_MS);
      await usuario.save();

      // Envia e-mail (fire-and-forget — não bloqueia a response)
      enviarEmailRecuperacao(email, usuario.nome, token).catch((err) =>
        logger.error("auth", "Erro ao enviar e-mail de recuperação", { erro: (err as Error).message })
      );
    }

    // Resposta genérica — nunca revela se o e-mail existe
    res.json({
      mensagem: "Se esse e-mail estiver cadastrado, você receberá um link de recuperação.",
    });
  })
);

/**
 * POST /auth/resetar-senha
 * Valida o token e altera a senha.
 */
authRouter.post(
  "/resetar-senha",
  limiteReset,
  validarBody(resetarSchema),
  rotaAsync(async (req, res) => {
    const { token, novaSenha } = req.body;

    const hash = crypto.createHash("sha256").update(token).digest("hex");

    const usuario = await UsuarioModel.findOne({
      resetSenhaHash: hash,
      resetSenhaExpira: { $gt: new Date() },
    });

    if (!usuario) {
      res.status(400).json({
        erro: "Link expirado ou inválido. Solicite uma nova recuperação.",
      });
      return;
    }

    // Atualiza a senha e limpa os campos de reset
    usuario.senhaHash = await bcrypt.hash(novaSenha, CUSTO_BCRYPT);
    usuario.resetSenhaHash = null;
    usuario.resetSenhaExpira = null;
    // Revoga sessão ativa para forçar login com nova senha
    usuario.refreshTokenHash = null;
    await usuario.save();

    // SEC-06: log de auditoria
    logger.info("auth", "Senha redefinida via token de recuperação", {
      usuarioId: usuario._id.toString(),
      ip: req.ip,
    });

    res.json({ mensagem: "Senha alterada com sucesso! Faça login com a nova senha." });
  })
);
