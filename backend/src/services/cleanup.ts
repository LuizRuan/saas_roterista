import { RoteiroModel } from "../models/roteiro";
import { logger } from "../lib/logger";

/**
 * P7 — Limpeza periódica de roteiros antigos de usuários free.
 *
 * Estratégia conservadora:
 * - Mantém os 30 roteiros mais recentes de cada usuário
 * - Roda no máximo 1x por hora (flag em memória)
 * - Não bloqueia nenhuma request — roda em background
 */

let ultimaLimpeza = 0;
const INTERVALO_MS = 60 * 60 * 1000; // 1 hora
const MAX_ROTEIROS_POR_USUARIO = 30;

export function agendarLimpezaRoteiros(): void {
  const agora = Date.now();
  if (agora - ultimaLimpeza < INTERVALO_MS) return;
  ultimaLimpeza = agora;

  // Fire-and-forget — não bloqueia a request
  limparRoteirosAntigos().catch((err) =>
    logger.warn("cleanup", "Erro na limpeza de roteiros", { erro: (err as Error).message })
  );
}

async function limparRoteirosAntigos(): Promise<void> {
  // Encontra usuários que têm mais de MAX_ROTEIROS_POR_USUARIO roteiros
  const resultado = await RoteiroModel.aggregate([
    { $group: { _id: "$usuarioId", total: { $sum: 1 } } },
    { $match: { total: { $gt: MAX_ROTEIROS_POR_USUARIO } } },
  ]);

  for (const { _id: usuarioId, total } of resultado) {
    const excesso = total - MAX_ROTEIROS_POR_USUARIO;
    if (excesso <= 0) continue;

    // Pega os IDs dos roteiros mais antigos além do limite
    const antigos = await RoteiroModel.find({ usuarioId })
      .sort({ createdAt: 1 }) // mais antigos primeiro
      .limit(excesso)
      .select("_id");

    const ids = antigos.map((r) => r._id);
    if (ids.length > 0) {
      await RoteiroModel.deleteMany({ _id: { $in: ids } });
      logger.info("cleanup", `Removidos ${ids.length} roteiros antigos`, { usuarioId: usuarioId.toString() });
    }
  }
}
