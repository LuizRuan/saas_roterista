import { UsuarioModel } from "../models/usuario";

/**
 * Reserva atomicamente uma vaga de geração de roteiro no mês corrente.
 *
 * Usa um update pipeline do Mongo (uma única operação atômica no documento
 * do usuário) para zerar/incrementar o contador conforme o mês mudou ou não.
 * Isso fecha a race condition de requisições concorrentes lendo a mesma
 * contagem antes de qualquer uma delas gravar (TOCTOU): o MongoDB serializa
 * escritas no mesmo documento, então cada requisição recebe um número de
 * sequência único.
 *
 * Retorna a quantidade de gerações já usadas NO MÊS (incluindo esta reserva)
 * e o plano do usuário — o documento completo já vem desta mesma query, então
 * o plano sai "de graça", sem round-trip extra ao banco.
 */
export async function reservarUsoMensal(
  usuarioId: string
): Promise<{ quantidade: number; plano: "free" | "pro" }> {
  const mes = inicioDoMes();

  const usuario = await UsuarioModel.findOneAndUpdate(
    { _id: usuarioId },
    [
      {
        $set: {
          usoRoteirosMensal: {
            mes,
            quantidade: {
              $cond: [
                { $eq: ["$usoRoteirosMensal.mes", mes] },
                { $add: [{ $ifNull: ["$usoRoteirosMensal.quantidade", 0] }, 1] },
                1,
              ],
            },
          },
        },
      },
    ],
    { new: true }
  );

  return {
    quantidade: usuario?.usoRoteirosMensal?.quantidade ?? 0,
    plano: usuario?.plano ?? "free",
  };
}

/**
 * Libera a vaga reservada quando a geração falha depois da reserva —
 * evita que uma falha da IA consuma o limite mensal do usuário.
 */
export async function liberarUsoMensal(usuarioId: string): Promise<void> {
  const mes = inicioDoMes();
  await UsuarioModel.updateOne(
    { _id: usuarioId, "usoRoteirosMensal.mes": mes },
    { $inc: { "usoRoteirosMensal.quantidade": -1 } }
  );
}

/** Meia-noite do dia 1 do mês corrente — usado como chave de reset mensal. */
export function inicioDoMes(): Date {
  const data = new Date();
  data.setDate(1);
  data.setHours(0, 0, 0, 0);
  return data;
}
