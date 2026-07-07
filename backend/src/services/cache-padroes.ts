import { PadraoViralModel, type PadraoViralDoc } from "../models/padraoViral";

/**
 * C4 — Cache em memória dos padrões virais ativos.
 * TTL: 5 minutos. Invalidado quando admin cria/edita/deleta um padrão.
 * Elimina queries repetidas ao Atlas a cada geração de roteiro.
 */

let _cache: PadraoViralDoc[] | null = null;
let _expira = 0;
const TTL_MS = 5 * 60 * 1000; // 5 minutos

export async function getPadroesAtivos(): Promise<PadraoViralDoc[]> {
  if (_cache && Date.now() < _expira) return _cache;

  _cache = await PadraoViralModel.find({ ativo: true })
    .sort({ createdAt: -1 })
    .limit(30);
  _expira = Date.now() + TTL_MS;

  return _cache;
}

/** Invalida o cache imediatamente — chamar quando admin alterar padrões. */
export function invalidarCachePadroes(): void {
  _cache = null;
  _expira = 0;
}
