import { env } from "../config/env";

type Nivel = "info" | "warn" | "error";

const CHAVES_SENSIVEIS = new Set([
  "senha",
  "novasenha",
  "senhahash",
  "token",
  "accesstoken",
  "refreshtoken",
  "refreshtokenhash",
  "resetsenhahash",
  "turnstiletoken",
  "authorization",
  "cookie",
  "jwt_access_secret",
  "jwt_refresh_secret",
]);

function redigir(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(redigir);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>).map(([chave, v]) => [
        chave,
        CHAVES_SENSIVEIS.has(chave.toLowerCase()) ? "[redigido]" : redigir(v),
      ])
    );
  }
  return valor;
}

function registrar(nivel: Nivel, modulo: string, mensagem: string, meta?: Record<string, unknown>) {
  const linha = {
    nivel,
    modulo,
    mensagem,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta: redigir(meta) } : {}),
  };

  const metodo = nivel === "error" ? console.error : nivel === "warn" ? console.warn : console.log;

  if (env.NODE_ENV === "production") {
    metodo(JSON.stringify(linha));
    return;
  }

  metodo(`[${modulo}] ${mensagem}`, ...(meta ? [linha.meta] : []));
}

/** Logging estruturado com redação automática de campos sensíveis no meta. */
export const logger = {
  info: (modulo: string, mensagem: string, meta?: Record<string, unknown>) =>
    registrar("info", modulo, mensagem, meta),
  warn: (modulo: string, mensagem: string, meta?: Record<string, unknown>) =>
    registrar("warn", modulo, mensagem, meta),
  error: (modulo: string, mensagem: string, meta?: Record<string, unknown>) =>
    registrar("error", modulo, mensagem, meta),
};
