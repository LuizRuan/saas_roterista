import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

/** Nome do cookie httpOnly que guarda o refresh token. */
export const REFRESH_COOKIE = "gancho_refresh";

/** Vida útil do refresh token: 7 dias (em ms, para o cookie). */
export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type PayloadToken = { sub: string; papel: "usuario" | "admin" };

export function gerarAccessToken(usuarioId: string, papel: "usuario" | "admin" = "usuario"): string {
  return jwt.sign({ sub: usuarioId, papel }, env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
}

export function gerarRefreshToken(usuarioId: string): string {
  // jti aleatório garante um token diferente a cada rotação,
  // mesmo que duas rotações aconteçam no mesmo segundo.
  return jwt.sign(
    { sub: usuarioId, jti: crypto.randomUUID() },
    env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
}

export function verificarAccessToken(token: string): PayloadToken | null {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as PayloadToken;
  } catch {
    return null;
  }
}

export function verificarRefreshToken(token: string): PayloadToken | null {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as PayloadToken;
  } catch {
    return null;
  }
}

/** Hash (SHA-256) do refresh token para comparação no banco — nunca guardamos o token em claro. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
