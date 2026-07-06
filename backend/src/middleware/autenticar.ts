import type { RequestHandler } from "express";
import { verificarAccessToken } from "../services/tokens";

declare global {
  namespace Express {
    interface Request {
      /** Preenchido pelo middleware autenticar. */
      usuarioId?: string;
    }
  }
}

/** Exige um access token válido em Authorization: Bearer <token>. */
export const autenticar: RequestHandler = (req, res, next) => {
  const cabecalho = req.headers.authorization;
  const token = cabecalho?.startsWith("Bearer ") ? cabecalho.slice(7) : null;

  if (!token) {
    res.status(401).json({ erro: "Não autenticado." });
    return;
  }

  const payload = verificarAccessToken(token);
  if (!payload) {
    res.status(401).json({ erro: "Sessão expirada. Entre novamente." });
    return;
  }

  req.usuarioId = payload.sub;
  next();
};
