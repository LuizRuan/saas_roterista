import { UsuarioModel } from "../models/usuario";

/**
 * Reserva atomicamente uma vaga de geração de roteiro no dia corrente.
 *
 * Usa um update pipeline do Mongo (uma única operação atômica no documento
 * do usuário) para zerar/incrementar o contador conforme o dia mudou ou não.
 * Isso fecha a race condition de requisições concorrentes lendo a mesma
 * contagem antes de qualquer uma delas gravar (TOCTOU): o MongoDB serializa
 * escritas no mesmo documento, então cada requisição recebe um número de
 * sequência único.
 *
 * Retorna a quantidade de gerações já usadas HOJE (incluindo esta reserva) e
 * o plano do usuário — o documento completo já vem desta mesma query, então
 * o plano sai "de graça", sem round-trip extra ao banco.
 */
export async function reservarUsoDiario(
  usuarioId: string
): Promise<{ quantidade: number; plano: "free" | "pro" }> {
  const hoje = inicioDoDia();

  const usuario = await UsuarioModel.findOneAndUpdate(
    { _id: usuarioId },
    [
      {
        $set: {
          usoRoteirosDiario: {
            dia: hoje,
            quantidade: {
              $cond: [
                { $eq: ["$usoRoteirosDiario.dia", hoje] },
                { $add: [{ $ifNull: ["$usoRoteirosDiario.quantidade", 0] }, 1] },
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
    quantidade: usuario?.usoRoteirosDiario?.quantidade ?? 0,
    plano: usuario?.plano ?? "free",
  };
}

/**
 * Libera a vaga reservada quando a geração falha depois da reserva —
 * evita que uma falha da IA consuma o limite diário do usuário.
 */
export async function liberarUsoDiario(usuarioId: string): Promise<void> {
  const hoje = inicioDoDia();
  await UsuarioModel.updateOne(
    { _id: usuarioId, "usoRoteirosDiario.dia": hoje },
    { $inc: { "usoRoteirosDiario.quantidade": -1 } }
  );
}

function inicioDoDia(): Date {
  const data = new Date();
  data.setHours(0, 0, 0, 0);
  return data;
}
