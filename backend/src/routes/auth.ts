import { Router, type CookieOptions, type RequestHandler } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import { UsuarioModel, usuarioPublico, type UsuarioDoc } from "../models/usuario";
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

const CUSTO_BCRYPT = 12;

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

const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  message: { erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo." },
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
  validarBody(cadastroSchema),
  rotaAsync(async (req, res) => {
    const { nome, email, senha } = req.body;

    const jaExiste = await UsuarioModel.exists({ email });
    if (jaExiste) {
      res.status(409).json({ erro: "Já existe uma conta com esse e-mail." });
      return;
    }

    const senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);
    const usuario = await UsuarioModel.create({ nome, email, senhaHash });

    const accessToken = await abrirSessao(res, usuario);
    res.status(201).json({ usuario: usuarioPublico(usuario), accessToken });
  })
);

authRouter.post(
  "/login",
  validarBody(loginSchema),
  rotaAsync(async (req, res) => {
    const { email, senha } = req.body;

    const usuario = await UsuarioModel.findOne({ email });
    // Mesma resposta para e-mail inexistente e senha errada,
    // para não revelar quais e-mails têm conta.
    const senhaOk = usuario && (await bcrypt.compare(senha, usuario.senhaHash));
    if (!usuario || !senhaOk) {
      res.status(401).json({ erro: "E-mail ou senha incorretos." });
      return;
    }

    const accessToken = await abrirSessao(res, usuario);
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
