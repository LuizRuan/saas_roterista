import type { RequestHandler } from "express";

/**
 * Usado depois de `autenticar`.
 * Bloqueia qualquer usuário que não seja admin com 403.
 */
export const exigirAdmin: RequestHandler = (req, res, next) => {
  if (req.usuarioPapel !== "admin") {
    res.status(403).json({ erro: "Acesso restrito a administradores." });
    return;
  }
  next();
};
